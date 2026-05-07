import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  lang: localStorage.getItem("ks_lang") || "en",
};

const langSlice = createSlice({
  name: "lang",
  initialState,
  reducers: {
    setLang(state, { payload }) {
      state.lang = payload;
    },
  },
});

export const { setLang } = langSlice.actions;
export default langSlice.reducer;
