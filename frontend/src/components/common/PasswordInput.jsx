import { useState } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import useLang from "../../hooks/useLang";

export default function PasswordInput({ value, onChange, placeholder, ...rest }) {
  const { t } = useLang();
  const [show, setShow] = useState(false);

  return (
    <div className="input-wrap">
      <input
        className="form-input"
        type={show ? "text" : "password"}
        placeholder={placeholder || t("password_placeholder")}
        value={value}
        onChange={onChange}
        {...rest}
      />
      <button
        type="button"
        className="input-eye"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? t("hide_password") : t("show_password")}
      >
        {show ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
      </button>
    </div>
  );
}
