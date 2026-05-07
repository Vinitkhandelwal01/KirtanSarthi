import { combineReducers } from "@reduxjs/toolkit";

import authReducer from "../slices/authSlice";
import profileReducer from "../slices/profileSlice";
import langReducer from "../slices/langSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  profile: profileReducer,
  lang: langReducer,
});

export default rootReducer;
