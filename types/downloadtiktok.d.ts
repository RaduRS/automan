declare module "@tobyg74/tiktok-api-dl" {
  export interface TiktokDownloaderResult {
    status: "success" | "error";
    message?: string;
    result?: {
      type: "video" | "image";
      id: string;
      createTime: number;
      desc: string;
      author: {
        uid: number;
        username: string;
        nickname: string;
        signature: string;
        region: string;
        avatarThumb: string[];
        avatarMedium: string[];
        url: string;
      };
      video?: {
        ratio: string;
        duration: number;
        playAddr: string[];
        downloadAddr: string[];
        cover: string[];
        dynamicCover: string[];
        originCover: string[];
      };
      images?: string[];
      music: {
        id: number;
        title: string;
        author: string;
        album: string;
        playUrl: string[];
        coverLarge: string[];
        coverMedium: string[];
        coverThumb: string[];
        duration: number;
        isCommerceMusic: boolean;
        isOriginalSound: boolean;
        isAuthorArtist: boolean;
      };
    };
  }

  export function Downloader(
    url: string,
    options?: {
      version?: "v1" | "v2" | "v3";
      proxy?: string;
      showOriginalResponse?: boolean;
    }
  ): Promise<TiktokDownloaderResult>;
}
