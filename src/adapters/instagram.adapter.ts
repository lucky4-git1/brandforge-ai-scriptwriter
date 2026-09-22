import { PlatformAdapter, ViralContent } from './types';

export class InstagramAdapter implements PlatformAdapter {
  platform = 'instagram';

  async fetchViralContent(niche: string, limit: number = 8): Promise<ViralContent[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const content: ViralContent[] = [];
    const seedString = niche.toLowerCase().replace(/[^a-z0-9]/g, '');
    let seed = 0;
    for (let i = 0; i < seedString.length; i++) {
      seed += seedString.charCodeAt(i);
    }

    const creators = [
      { name: 'Sarah Jenkins', handle: '@sarahcreates' },
      { name: 'Mike Ross', handle: '@mike.growth' },
      { name: 'Elena Rodriguez', handle: '@elena.inspires' },
      { name: 'David Chen', handle: '@david_daily' },
      { name: 'Jessica Taylor', handle: '@jesstips' },
      { name: 'Alex Thompson', handle: '@alex_hacks' },
    ];

    const formats = ['Reel', 'Carousel', 'Single Image'];
    const hooks = [
      'Stop doing this if you want to succeed in',
      'The secret nobody tells you about',
      'How I grew my business using',
      '3 tools you need for',
      'Why your current strategy is failing in',
    ];

    for (let i = 0; i < limit; i++) {
      const creatorIndex = (seed + i) % creators.length;
      const creator = creators[creatorIndex];
      const formatIndex = (seed + i * 2) % formats.length;
      const hookIndex = (seed + i * 3) % hooks.length;
      
      const views = 10000 + Math.floor(((seed * (i + 1) * 1234) % 5000000));
      const likes = Math.floor(views * (0.02 + ((seed * (i + 1)) % 15) / 100)); // 2-17% likes
      const comments = Math.floor(likes * (0.01 + ((seed * (i + 1)) % 5) / 100)); // 1-6% comments
      const engagementRate = ((likes + comments) / views) * 100;
      
      const publishDate = new Date();
      publishDate.setDate(publishDate.getDate() - (i * 2 + (seed % 5)));

      content.push({
        id: `ig_${niche}_${i}_${seed}`,
        title: `${hooks[hookIndex]} ${niche}...`,
        platform: 'instagram',
        views,
        likes,
        comments,
        engagementRate,
        creator: creator.name,
        creatorHandle: creator.handle,
        publishDate: publishDate.toISOString(),
        trendScore: 70 + ((seed + i * 7) % 30),
        format: formats[formatIndex],
        hashtags: [`#${niche.replace(/\s+/g, '')}`, '#trending', '#tips'],
        url: `https://instagram.com/p/mock_${i}`,
      });
    }

    return content.sort((a, b) => b.engagementRate - a.engagementRate);
  }

  isAvailable(): boolean {
    return true; // Mock adapter is always available
  }
}
