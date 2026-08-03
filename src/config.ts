// Replaces the old canvas prop editor.
export interface SiteConfig {
  accent: string;
  motion: 'full' | 'subtle' | 'off';
  smoothScroll: boolean;
  nodeCount: number;
  packets: number;
}

export const CONFIG: SiteConfig = {
  accent: '#47C78A',        // brand accent (alt: '#078A8A')
  motion: 'full',           // 'full' | 'subtle' | 'off'
  smoothScroll: true,       // Lenis smooth scrolling on fine-pointer devices
  nodeCount: 2400,          // hero galaxy population (600-3000)
  packets: 14               // animated packets riding the galaxy links (0-40)
};
