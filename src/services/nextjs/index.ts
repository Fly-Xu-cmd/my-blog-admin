import {
  addCategory,
  addTag,
  deleteCategory,
  deleteTag,
  getCategories,
  getTags,
  updateCategory,
  updateTag,
} from "./category";
import {
  addDynamic,
  deleteDynamic,
  getDynamics,
  updateDynamic,
} from "./dynamic";
import { login, loginOut, checkToken } from "./login";
import { addPost, deletePost, getPosts, updatePost } from "./post";

export {
  addCategory,
  addDynamic,
  addPost,
  addTag,
  deleteCategory,
  deleteDynamic,
  deletePost,
  deleteTag,
  getCategories,
  getDynamics,
  getPosts,
  getTags,
  login,
  loginOut,
  updateCategory,
  updateDynamic,
  updatePost,
  updateTag,
  checkToken,
};
