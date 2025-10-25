// @ts-ignore
/* eslint-disable */

declare namespace API {
  type Post = {
    id?: number;
    title?: string;
    excerpt?: string;
    content?: string;
    cover?: string;
    createdAt?: string;
    updatedAt?: string;
    slug?: string;
    published?: boolean;
    tags?: string[];
  };

  type PostList = {
    data?: Post[];
    /** 列表的内容总数 */
    total?: number;
    ok?: boolean;
  };

  type Dynamic = {
    id?: number;
    content?: string;
    excerpt?: string;
    title?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}
