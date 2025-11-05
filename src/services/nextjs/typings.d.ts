// @ts-ignore
/* eslint-disable */

declare namespace API {
  type Post = {
    id?: number;
    title?: string;
    excerpt?: string;
    content?: string;
    cover?: string;
    category?: Category;
    tags?: string[];
    createdAt?: string;
    updatedAt?: string;
    slug?: string;
    published?: boolean;
  };

  type PostList = {
    data?: Post[];
    /** 列表的内容总数 */
    total?: number;
    ok?: boolean;
    error?: string;
  };

  type Dynamic = {
    id?: number;
    content?: string;
    excerpt?: string;
    title?: string;
    createdAt?: string;
    updatedAt?: string;
  };

  type DynamicList = {
    data?: Dynamic[];
    /** 列表的内容总数 */
    total?: number;
    ok?: boolean;
    error?: string;
  };

  type Tag = {
    id?: number;
    name?: string;
  };
  type Category = {
    id?: number;
    name?: string;
  };
  type CategoryList = {
    data?: Category[];
    /** 列表的内容总数 */
    total?: number;
    ok?: boolean;
    error?: string;
  };
  type TagList = {
    data?: Tag[];
    /** 列表的内容总数 */
    total?: number;
    ok?: boolean;
    error?: string;
  };
  type LoginRequest = {
    username?: string;
    password?: string;
    remember?: boolean;
  };
  type LoginResponse = {
    data?: {
      token?: string;
    };
    ok?: boolean;
    error?: string;
  };
}
