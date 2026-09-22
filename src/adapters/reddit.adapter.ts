import { PlatformAdapter, ViralContent } from './types';

export class RedditAdapter implements PlatformAdapter {
  platform = 'reddit';

  async fetchViralContent(niche: string, limit: number = 8): Promise<ViralContent[]> {
    await new Promise(resolve => setTimeout(resolve, 600));

    const content: ViralContent[] = [];
    const seedString = niche.toLowerCase().replace(/[^a-z0-9]/g, '');
    let seed = 0;
    for (let i = 0; i < seedString.length; i++) {
      seed += seedString.charCodeAt(i);
    }

    const subreddits = [
      `r/${niche.replace(/\s+/g, '')}`,
      'r/Entrepreneur',
      'r/marketing',
      'r/socialmedia',
      'r/smallbusiness'
    ];

    const formats = ['Discussion', 'AMA', 'Guide', 'Story', 'Question'];
    const hooks = [
      `What is your controversial opinion about ${niche}?`,
      `I have been doing ${niche} for 10 years. AMA.`,
      `The ultimate guide to succeeding in ${niche}`,
      `Need advice: I am failing at ${niche}`,
      `Let's talk about the current state of ${niche}`,
    ];

    for (let i = 0; i < limit; i++) {
      const subIndex = (seed + i * 2) % subreddits.length;
      const formatIndex = (seed + i * 3) % formats.length;
      const hookIndex = (seed + i * 4) % hooks.length;
      
      const upvotes = 50 + Math.floor(((seed * (i + 1) * 789) % 20000));
      const comments = Math.floor(upvotes * (0.1 + ((seed * (i + 1)) % 30) / 100)); // 10-40% comments relative to upvotes
      const views = upvotes * Math.floor(10 + (seed % 20)); // Approximate views from upvotes
      const engagementRate = ((upvotes + comments) / views) * 100;
      
      const publishDate = new Date();
      publishDate.setDate(publishDate.getDate() - (i * 2 + (seed % 10)));

      content.push({
        id: `rd_${niche}_${i}_${seed}`,
        title: hooks[hookIndex],
        platform: 'reddit',
        views,
        likes: upvotes, // map likes to upvotes
        comments,
        engagementRate,
        creator: 'u/reddituser',
        creatorHandle: 'u/reddituser',
        publishDate: publishDate.toISOString(),
        trendScore: 60 + ((seed + i * 8) % 40),
        format: formats[formatIndex],
        hashtags: [subreddits[subIndex]], // Use subreddit as hashtag for UI purposes
        url: `https://reddit.com/r/mock/comments/mock_${i}`,
      });
    }

    return content.sort((a, b) => b.engagementRate - a.engagementRate);
  }

  isAvailable(): boolean {
    return true;
  }
}
