import { PlatformAdapter, ViralContent } from './types';

export class TiktokAdapter implements PlatformAdapter {
  platform = 'tiktok';

  async fetchViralContent(niche: string, limit: number = 8): Promise<ViralContent[]> {
    await new Promise(resolve => setTimeout(resolve, 900));

    const content: ViralContent[] = [];
    const seedString = niche.toLowerCase().replace(/[^a-z0-9]/g, '');
    let seed = 0;
    for (let i = 0; i < seedString.length; i++) {
      seed += seedString.charCodeAt(i);
    }

    const creators = [
      { name: 'TikTok Coach Jake', handle: '@coachjake' },
      { name: 'Mia Creates', handle: '@miacreates' },
      { name: 'The Growth Guy', handle: '@growthguy' },
      { name: 'Sophie TikToks', handle: '@sophietoks' },
      { name: 'Niche Expert Tom', handle: '@tomniche' },
    ];

    const formats = ['Tutorial', 'Duet', 'Stitch', 'Storytime', 'Trend Dance'];
    const hooks = [
      'Nobody talks about this hack for',
      'I tested the viral trick for',
      'Here is what happened when I tried',
      'You are wasting time if you do this in',
      '3 things nobody knows about',
    ];

    for (let i = 0; i < limit; i++) {
      const creatorIndex = (seed + i * 2) % creators.length;
      const creator = creators[creatorIndex];
      const formatIndex = (seed + i * 3) % formats.length;
      const hookIndex = (seed + i * 4) % hooks.length;
      
      const views = 50000 + Math.floor(((seed * (i + 1) * 3456) % 20000000));
      const likes = Math.floor(views * (0.05 + ((seed * (i + 1)) % 15) / 100)); // 5-20% likes
      const comments = Math.floor(likes * (0.01 + ((seed * (i + 1)) % 5) / 100)); // 1-6% comments
      const engagementRate = ((likes + comments) / views) * 100;
      
      const publishDate = new Date();
      publishDate.setDate(publishDate.getDate() - (i + (seed % 3)));

      content.push({
        id: `tt_${niche}_${i}_${seed}`,
        title: `${hooks[hookIndex]} ${niche} 🤯`,
        platform: 'tiktok',
        views,
        likes,
        comments,
        engagementRate,
        creator: creator.name,
        creatorHandle: creator.handle,
        publishDate: publishDate.toISOString(),
        trendScore: 75 + ((seed + i * 5) % 25),
        format: formats[formatIndex],
        hashtags: [`#${niche.replace(/\s+/g, '')}`, '#fyp', '#viral', '#learnontiktok'],
        url: `https://tiktok.com/@${creator.handle.replace('@', '')}/video/mock_${i}`,
      });
    }

    return content.sort((a, b) => b.engagementRate - a.engagementRate);
  }

  isAvailable(): boolean {
    return true;
  }
}
