import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { itemService } from '@/services/item.service';
import AssetDetailsDrawer from './AssetDetailsDrawer';

export default function ItemDeepLinkPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['item-deeplink', id],
    queryFn: () => itemService.getItemTimeline(id!),
    enabled: !!id,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isError || !data?.item) {
    return (
      <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--bg-dark)', color: 'var(--text-main)' }}>
        <p style={{ fontSize: 16, fontWeight: 700 }}>Asset not found.</p>
        <button className="outline-btn" onClick={() => navigate('/items')}>Go to Items</button>
      </div>
    );
  }

  return (
    <AssetDetailsDrawer
      item={data.item}
      isOpen={true}
      onClose={() => navigate('/items')}
    />
  );
}
