"""Tkinter-based website scraper for chatbot training.

This module bundles a GUI (`ScraperApp`) and a headless scraping engine (`Scraper`) that can
fetch HTML pages via `requests` or Selenium (when available), extract text, images, and
links, and export the captured content to CSV files. The implementation focuses on
operating safely with retrying network requests, respecting crawl depth and page limits,
and providing pause/stop controls for long-running jobs.
"""
from __future__ import annotations

import csv
import datetime as dt
import logging
import os
import queue
import threading
import time
from dataclasses import dataclass
from typing import Callable, List, Optional, Set, Tuple
from urllib.parse import urldefrag, urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    SELENIUM_AVAILABLE = True
except Exception:  # pragma: no cover - optional dependency
    SELENIUM_AVAILABLE = False


@dataclass
class ScraperConfig:
    base_url: str
    output_dir: str
    method: str = "requests"
    headless: bool = True
    stealth: bool = True
    proxy: Optional[str] = None
    max_depth: int = 2
    max_pages: int = 100
    delay_seconds: float = 1.0


@dataclass
class PageRecord:
    url: str
    title: str
    text: str
    retrieved_at: dt.datetime


@dataclass
class LinkRecord:
    source: str
    target: str


@dataclass
class ImageRecord:
    page: str
    src: str


class Scraper:
    """Core scraping engine that can be driven from a GUI or CLI."""

    def __init__(self, config: ScraperConfig, logger: Optional[logging.Logger] = None):
        self.config = config
        self.logger = logger or logging.getLogger(__name__)
        self.session = self._build_session()
        self.stop_event = threading.Event()
        self.pause_event = threading.Event()
        self.visited: Set[str] = set()
        self.page_records: List[PageRecord] = []
        self.link_records: List[LinkRecord] = []
        self.image_records: List[ImageRecord] = []

    def _build_session(self) -> requests.Session:
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "OPTIONS"],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy, pool_connections=10, pool_maxsize=20)
        session = requests.Session()
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        if self.config.proxy:
            session.proxies.update({"http": self.config.proxy, "https": self.config.proxy})
        session.headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                )
            }
        )
        return session

    @staticmethod
    def normalize_url(url: str) -> str:
        """Remove URL fragments and enforce lowercase scheme/host."""
        clean_url, _ = urldefrag(url)
        parsed = urlparse(clean_url)
        normalized = parsed._replace(scheme=parsed.scheme.lower(), netloc=parsed.netloc.lower())
        return normalized.geturl()

    def _is_same_domain(self, url: str) -> bool:
        base = urlparse(self.config.base_url)
        target = urlparse(url)
        return base.netloc == target.netloc

    def should_visit(self, url: str, depth: int) -> bool:
        if depth > self.config.max_depth:
            return False
        normalized = self.normalize_url(url)
        if normalized in self.visited:
            return False
        if not self._is_same_domain(normalized):
            return False
        return True

    def _fetch_requests(self, url: str) -> str:
        response = self.session.get(url, timeout=15)
        response.raise_for_status()
        return response.text

    def _fetch_selenium(self, url: str) -> str:
        if not SELENIUM_AVAILABLE:
            raise RuntimeError("Selenium is not installed. Please install selenium to use this mode.")
        options = Options()
        if self.config.headless:
            options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        if self.config.proxy:
            options.add_argument(f"--proxy-server={self.config.proxy}")
        driver = webdriver.Chrome(options=options)
        try:
            driver.get(url)
            return driver.page_source
        finally:
            driver.quit()

    def fetch_html(self, url: str) -> str:
        if self.config.method == "selenium":
            return self._fetch_selenium(url)
        return self._fetch_requests(url)

    def extract(self, html: str, url: str) -> Tuple[PageRecord, List[str], List[str]]:
        soup = BeautifulSoup(html, "html.parser")
        title = soup.title.string.strip() if soup.title and soup.title.string else ""
        texts = [node.strip() for node in soup.stripped_strings]
        page_text = " ".join(texts)
        links: List[str] = []
        images: List[str] = []
        for anchor in soup.find_all("a", href=True):
            absolute = urljoin(url, anchor.get("href"))
            links.append(absolute)
        for img in soup.find_all("img", src=True):
            absolute_src = urljoin(url, img.get("src"))
            images.append(absolute_src)
        page_record = PageRecord(url=url, title=title, text=page_text, retrieved_at=dt.datetime.utcnow())
        return page_record, links, images

    def scrape(
        self, progress_cb: Optional[Callable[[int, int], None]] = None, log_cb: Optional[Callable[[str], None]] = None
    ) -> None:
        to_visit: "queue.Queue[Tuple[str, int]]" = queue.Queue()
        start_url = self.normalize_url(self.config.base_url)
        to_visit.put((start_url, 0))
        pages_processed = 0

        while not to_visit.empty() and pages_processed < self.config.max_pages and not self.stop_event.is_set():
            if self.pause_event.is_set():
                time.sleep(0.2)
                continue

            url, depth = to_visit.get()
            if not self.should_visit(url, depth):
                continue

            self.visited.add(self.normalize_url(url))
            try:
                html = self.fetch_html(url)
                page_record, links, images = self.extract(html, url)
                self.page_records.append(page_record)

                for link in links:
                    self.link_records.append(LinkRecord(source=url, target=self.normalize_url(link)))
                    if self.should_visit(link, depth + 1):
                        to_visit.put((link, depth + 1))

                for image in images:
                    self.image_records.append(ImageRecord(page=url, src=self.normalize_url(image)))

                pages_processed += 1
                if log_cb:
                    log_cb(f"Scraped {url} ({pages_processed}/{self.config.max_pages})")
                if progress_cb:
                    progress_cb(pages_processed, self.config.max_pages)
            except Exception as exc:  # pragma: no cover - network errors are runtime concerns
                if log_cb:
                    log_cb(f"Error scraping {url}: {exc}")
            finally:
                time.sleep(self.config.delay_seconds)

    def pause(self) -> None:
        self.pause_event.set()

    def resume(self) -> None:
        self.pause_event.clear()

    def stop(self) -> None:
        self.stop_event.set()

    def export(self) -> None:
        os.makedirs(self.config.output_dir, exist_ok=True)
        pages_path = os.path.join(self.config.output_dir, "pages.csv")
        links_path = os.path.join(self.config.output_dir, "links.csv")
        images_path = os.path.join(self.config.output_dir, "images.csv")

        with open(pages_path, "w", newline="", encoding="utf-8") as pages_file:
            writer = csv.writer(pages_file)
            writer.writerow(["url", "title", "text", "retrieved_at"])
            for record in self.page_records:
                writer.writerow([record.url, record.title, record.text, record.retrieved_at.isoformat()])

        with open(links_path, "w", newline="", encoding="utf-8") as links_file:
            writer = csv.writer(links_file)
            writer.writerow(["source", "target"])
            for record in self.link_records:
                writer.writerow([record.source, record.target])

        with open(images_path, "w", newline="", encoding="utf-8") as images_file:
            writer = csv.writer(images_file)
            writer.writerow(["page", "src"])
            for record in self.image_records:
                writer.writerow([record.page, record.src])


class ScraperApp:
    """Tkinter GUI wrapper for the scraping engine."""

    def __init__(self) -> None:
        import tkinter as tk
        from tkinter import filedialog, messagebox, ttk

        self.tk = tk
        self.ttk = ttk
        self.messagebox = messagebox
        self.filedialog = filedialog

        self.root = tk.Tk()
        self.root.title("Advanced Web Scraper v3.0 - Stealth Edition")
        self.root.geometry("900x700")

        default_output = os.path.join(os.getcwd(), "scraper_output")
        os.makedirs(default_output, exist_ok=True)

        self.url_var = tk.StringVar(value="https://")
        self.output_var = tk.StringVar(value=default_output)
        self.method_var = tk.StringVar(value="requests")
        self.headless_var = tk.BooleanVar(value=True)
        self.proxy_var = tk.StringVar(value="")
        self.depth_var = tk.IntVar(value=2)
        self.page_limit_var = tk.IntVar(value=100)
        self.delay_var = tk.DoubleVar(value=1.0)

        self.log_text: Optional[tk.Text] = None
        self.progress_var: Optional[tk.DoubleVar] = None
        self.progress_label: Optional[tk.Label] = None

        self.scraper: Optional[Scraper] = None
        self.worker: Optional[threading.Thread] = None

        self._build_ui()

    def _build_ui(self) -> None:
        tk = self.tk
        ttk = self.ttk

        frame = ttk.Frame(self.root, padding=10)
        frame.pack(fill=tk.BOTH, expand=True)

        config = ttk.LabelFrame(frame, text="Configuration", padding=10)
        config.pack(fill=tk.X, pady=5)

        ttk.Label(config, text="Target URL").grid(row=0, column=0, sticky=tk.W)
        ttk.Entry(config, textvariable=self.url_var, width=50).grid(row=0, column=1, columnspan=3, sticky=tk.EW, padx=5)

        ttk.Label(config, text="Output Directory").grid(row=1, column=0, sticky=tk.W)
        ttk.Entry(config, textvariable=self.output_var, width=40).grid(row=1, column=1, columnspan=2, sticky=tk.EW, padx=5)
        ttk.Button(config, text="Browse", command=self._browse).grid(row=1, column=3, sticky=tk.E)

        ttk.Label(config, text="Method").grid(row=2, column=0, sticky=tk.W)
        ttk.Radiobutton(config, text="Requests", variable=self.method_var, value="requests").grid(row=2, column=1, sticky=tk.W)
        ttk.Radiobutton(
            config,
            text="Selenium",
            variable=self.method_var,
            value="selenium",
            state=tk.NORMAL if SELENIUM_AVAILABLE else tk.DISABLED,
        ).grid(row=2, column=2, sticky=tk.W)

        ttk.Label(config, text="Proxy").grid(row=3, column=0, sticky=tk.W)
        ttk.Entry(config, textvariable=self.proxy_var, width=40).grid(row=3, column=1, columnspan=2, sticky=tk.EW, padx=5)

        ttk.Label(config, text="Max Depth").grid(row=4, column=0, sticky=tk.W)
        ttk.Spinbox(config, from_=1, to=10, textvariable=self.depth_var, width=8).grid(row=4, column=1, sticky=tk.W)

        ttk.Label(config, text="Max Pages").grid(row=4, column=2, sticky=tk.W)
        ttk.Spinbox(config, from_=1, to=5000, textvariable=self.page_limit_var, width=8).grid(row=4, column=3, sticky=tk.W)

        ttk.Label(config, text="Delay (sec)").grid(row=5, column=0, sticky=tk.W)
        ttk.Spinbox(config, from_=0.1, to=10.0, increment=0.5, textvariable=self.delay_var, width=8).grid(
            row=5, column=1, sticky=tk.W
        )

        controls = ttk.LabelFrame(frame, text="Controls", padding=10)
        controls.pack(fill=tk.X, pady=5)

        ttk.Button(controls, text="Start", command=self.start).pack(side=tk.LEFT, padx=5)
        ttk.Button(controls, text="Pause/Resume", command=self.toggle_pause).pack(side=tk.LEFT, padx=5)
        ttk.Button(controls, text="Stop", command=self.stop).pack(side=tk.LEFT, padx=5)

        log_frame = ttk.LabelFrame(frame, text="Logs", padding=10)
        log_frame.pack(fill=tk.BOTH, expand=True, pady=5)

        self.log_text = tk.Text(log_frame, height=18, wrap=tk.WORD)
        self.log_text.pack(fill=tk.BOTH, expand=True)

        progress_frame = ttk.Frame(frame)
        progress_frame.pack(fill=tk.X, pady=5)
        self.progress_var = tk.DoubleVar(value=0)
        progress_bar = ttk.Progressbar(progress_frame, maximum=100, variable=self.progress_var)
        progress_bar.pack(fill=tk.X, expand=True, side=tk.LEFT)
        self.progress_label = ttk.Label(progress_frame, text="0%")
        self.progress_label.pack(side=tk.RIGHT, padx=5)

    def _browse(self) -> None:
        directory = self.filedialog.askdirectory()
        if directory:
            self.output_var.set(directory)

    def _log(self, message: str) -> None:
        timestamp = dt.datetime.now().strftime("%H:%M:%S")
        if self.log_text:
            self.log_text.insert("end", f"[{timestamp}] {message}\n")
            self.log_text.see("end")

    def _progress(self, current: int, total: int) -> None:
        if not self.progress_var or not self.progress_label:
            return
        percentage = min(100, round((current / max(total, 1)) * 100, 1))
        self.progress_var.set(percentage)
        self.progress_label.config(text=f"{percentage}%")

    def _build_config(self) -> ScraperConfig:
        return ScraperConfig(
            base_url=self.url_var.get().strip(),
            output_dir=self.output_var.get().strip(),
            method=self.method_var.get(),
            headless=self.headless_var.get(),
            proxy=self.proxy_var.get().strip() or None,
            max_depth=self.depth_var.get(),
            max_pages=self.page_limit_var.get(),
            delay_seconds=self.delay_var.get(),
        )

    def start(self) -> None:
        if self.worker and self.worker.is_alive():
            self.messagebox.showwarning("Scraper Running", "Please stop the current job before starting another.")
            return

        try:
            config = self._build_config()
        except Exception as exc:
            self.messagebox.showerror("Configuration Error", str(exc))
            return

        self.scraper = Scraper(config=config)
        self.worker = threading.Thread(target=self._run_scraper, daemon=True)
        self.worker.start()

    def _run_scraper(self) -> None:
        assert self.scraper
        self._log("Starting scrape...")
        self.scraper.scrape(progress_cb=self._progress, log_cb=self._log)
        self.scraper.export()
        self._log(f"Exported results to {self.scraper.config.output_dir}")

    def toggle_pause(self) -> None:
        if not self.scraper:
            return
        if self.scraper.pause_event.is_set():
            self.scraper.resume()
            self._log("Resumed scraping")
        else:
            self.scraper.pause()
            self._log("Paused scraping")

    def stop(self) -> None:
        if not self.scraper:
            return
        self.scraper.stop()
        self._log("Stopping after current page...")

    def run(self) -> None:
        self.root.protocol("WM_DELETE_WINDOW", self.stop)
        self.root.mainloop()


__all__ = [
    "Scraper",
    "ScraperApp",
    "ScraperConfig",
    "PageRecord",
    "LinkRecord",
    "ImageRecord",
]
