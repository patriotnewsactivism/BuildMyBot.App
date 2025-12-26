import unittest

from tools.web_scraper import Scraper, ScraperConfig


class ScraperUrlTests(unittest.TestCase):
    def setUp(self) -> None:
        self.config = ScraperConfig(
            base_url="https://example.com/start",
            output_dir="/tmp/output",
            max_depth=2,
            max_pages=10,
        )
        self.scraper = Scraper(self.config)

    def test_normalize_url_strips_fragment(self):
        normalized = self.scraper.normalize_url("https://example.com/path#section")
        self.assertEqual(normalized, "https://example.com/path")

    def test_should_visit_blocks_out_of_scope_domain(self):
        allow = self.scraper.should_visit("https://example.com/page", depth=1)
        block = self.scraper.should_visit("https://other.com/page", depth=1)
        self.assertTrue(allow)
        self.assertFalse(block)

    def test_should_visit_respects_depth(self):
        self.assertTrue(self.scraper.should_visit("https://example.com/page", depth=2))
        self.assertFalse(self.scraper.should_visit("https://example.com/page", depth=3))

    def test_should_visit_skips_visited(self):
        url = "https://example.com/page"
        self.scraper.visited.add(self.scraper.normalize_url(url))
        self.assertFalse(self.scraper.should_visit(url, depth=1))


if __name__ == "__main__":
    unittest.main()
