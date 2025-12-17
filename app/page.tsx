import dynamic from 'next/dynamic';

const ClientApp = dynamic(() => import('../App'), {
  ssr: false,
  loading: () => (
    <div className="app-loader" data-testid="app-loader">
      Loading BuildMyBot...
    </div>
  ),
});

export default function HomePage() {
  return <ClientApp />;
}
