import { PlatformAdapter, ViralContent } from './types';

export class YoutubeAdapter implements PlatformAdapter {
  platform = 'youtube';

  async fetchViralContent(niche: string, limit: number = 8): Promise<ViralContent[]> {
    await new Promise(resolve => setTimeout(resolve, 700));

    const content: ViralContent[] = [];
    const seedString = niche.toLowerCase().replace(/[^a-z0-9]/g, '');
    let seed = 0;
    for (let i = 0; i < seedString.length; i++) {
      seed += seedString.charCodeAt(i);
    }

    const creators = [
      { name: 'Tech & Trends', handle: '@techtrends' },
      { name: 'Growth Masterclass', handle: '@growthmasterclass' },
      { name: 'Niche Deep Dive', handle: '@nichedeepdive' },
      { name: 'Shorts Factory', handle: '@shortsfactory' },
    ];

    const formats = ['Shorts', 'Tutorial', 'Review', 'Vlog', 'Listicle'];
    const hooks = [
      `The Ultimate Guide to ${niche}`,
      `Why Everyone is Wrong About ${niche}`,
      `I Tried ${niche} for 30 Days (Results)`,
      `Top 5 Mistakes in ${niche}`,
      `How to Start with ${niche} in 2025`,
    ];

    for (let i = 0; i < limit; i++) {
      const creatorIndex = (seed + i * 3) % creators.length;
      const creator = creators[creatorIndex];
      const formatIndex = (seed + i * 4) % formats.length;
      const hookIndex = (seed + i * 5) % hooks.length;
      
      const views = 5000 + Math.floor(((seed * (i + 1) * 5678) % 10000000));
      const likes = Math.floor(views * (0.01 + ((seed * (i + 1)) % 8) / 100)); // 1-9% likes
      const comments = Math.floor(likes * (0.05 + ((seed * (i + 1)) % 10) / 100)); // 5-15% comments
      const engagementRate = ((likes + comments) / views) * 100;
      
      const publishDate = new Date();
      publishDate.setDate(publishDate.getDate() - (i * 3 + (seed % 7)));

      content.push({
        id: `yt_${niche}_${i}_${seed}`,
        title: hooks[hookIndex],
        platform: 'youtube',
        views,
        likes,
        comments,
        engagementRate,
        creator: creator.name,
        creatorHandle: creator.handle,
        publishDate: publishDate.toISOString(),
        trendScore: 65 + ((seed + i * 9) % 35),
        format: formats[formatIndex],
        hashtags: [`#${niche.replace(/\s+/g, '')}`, '#shorts', '#youtube'],
        url: `https://youtube.com/watch?v=mock_${i}`,
      });
    }

    return content.sort((a, b) => b.engagementRate - a.engagementRate);
  }

  isAvailable(): boolean {
    return true;
  }
}
