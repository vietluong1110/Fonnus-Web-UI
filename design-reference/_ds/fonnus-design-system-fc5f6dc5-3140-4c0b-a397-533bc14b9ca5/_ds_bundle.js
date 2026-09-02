/* @ds-bundle: {"format":4,"namespace":"FonnusDesignSystem_fc5f6d","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Logo","sourcePath":"components/core/Logo.jsx"},{"name":"SpeechBubble","sourcePath":"components/core/SpeechBubble.jsx"},{"name":"Stat","sourcePath":"components/core/Stat.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"d03b3b86583b","components/core/Button.jsx":"99efa8eeb44e","components/core/Card.jsx":"3fecb1d87147","components/core/Icon.jsx":"dcaecc4eabc1","components/core/IconButton.jsx":"2d4db23c53de","components/core/Logo.jsx":"8dba7303cd6a","components/core/SpeechBubble.jsx":"fe0d2d4ec876","components/core/Stat.jsx":"39640b38f50d","components/core/Tag.jsx":"2bcee36c0ff5","components/feedback/Dialog.jsx":"a08d2972fa9e","components/feedback/Toast.jsx":"ce5dcdf1e7aa","components/feedback/Tooltip.jsx":"b556fe66f37c","components/forms/Checkbox.jsx":"240621f3acf3","components/forms/Input.jsx":"e06ad81c4480","components/forms/Radio.jsx":"bdc9debc8543","components/forms/Select.jsx":"5bfb3c79d4e4","components/forms/Switch.jsx":"18e6a2526a62","components/navigation/Tabs.jsx":"231bc55ee4da","slides/SlideKit.jsx":"b906005e1999","ui_kits/dashboard/DashboardApp.jsx":"4f21d7985098","ui_kits/dashboard/DashboardScreens.jsx":"465d616c9876","ui_kits/landing/LandingPage.jsx":"60e2cc73a04e","ui_kits/landing/LandingSections.jsx":"1871860c410a"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.FonnusDesignSystem_fc5f6d = window.FonnusDesignSystem_fc5f6d || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const map = {
  neutral: {
    bg: "rgba(38,31,24,.06)",
    fg: "var(--text-muted)"
  },
  success: {
    bg: "rgba(62,123,71,.12)",
    fg: "var(--success)"
  },
  warning: {
    bg: "rgba(143,99,0,.12)",
    fg: "var(--warning)"
  },
  error: {
    bg: "rgba(178,58,46,.12)",
    fg: "var(--error)"
  },
  info: {
    bg: "rgba(47,109,126,.12)",
    fg: "var(--info)"
  },
  terracotta: {
    bg: "rgba(184,92,43,.12)",
    fg: "var(--text-accent)"
  },
  lemongrass: {
    bg: "rgba(110,127,83,.16)",
    fg: "var(--lemongrass)"
  }
};
function Badge({
  children,
  tone = "neutral",
  dot = false,
  style,
  ...rest
}) {
  const t = map[tone] || map.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      borderRadius: "var(--radius-pill)",
      background: t.bg,
      color: t.fg,
      fontFamily: "var(--font-ui)",
      fontSize: "var(--size-ui)",
      fontWeight: "var(--weight-ui)",
      lineHeight: 1.4,
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), dot ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: "currentColor"
    }
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const sizes = {
  sm: {
    padding: "8px 14px",
    fontSize: "var(--size-ui)",
    radius: "var(--radius-sm)",
    gap: "6px",
    icon: 16
  },
  md: {
    padding: "11px 20px",
    fontSize: "var(--size-body-sm)",
    radius: "var(--radius-md)",
    gap: "8px",
    icon: 18
  },
  lg: {
    padding: "15px 26px",
    fontSize: "var(--size-body)",
    radius: "var(--radius-md)",
    gap: "10px",
    icon: 20
  }
};

/* Primary uses Nút #A04E1F (5.4:1) with Kem text — never plain Đất nung behind small text. */
function variantStyle(variant) {
  if (variant === "secondary") return {
    background: "var(--action-secondary)",
    color: "var(--text-body)",
    boxShadow: "inset 0 0 0 1px var(--border-strong)"
  };
  if (variant === "ghost") return {
    background: "transparent",
    color: "var(--text-accent)"
  };
  if (variant === "inverse") return {
    background: "var(--cream-night)",
    color: "var(--night)"
  };
  return {
    background: "var(--action-primary)",
    color: "var(--text-on-accent)"
  };
}
function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  fullWidth = false,
  disabled = false,
  type = "button",
  onClick,
  style,
  ...rest
}) {
  const s = sizes[size] || sizes.md;
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const v = variantStyle(variant);
  const hoverBg = variant === "primary" ? "var(--action-primary-hover)" : variant === "secondary" ? "var(--action-secondary-hover)" : variant === "ghost" ? "var(--action-ghost-hover)" : "var(--cream)";
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      display: fullWidth ? "flex" : "inline-flex",
      width: fullWidth ? "100%" : undefined,
      alignItems: "center",
      justifyContent: "center",
      gap: s.gap,
      font: "inherit",
      fontFamily: "var(--font-ui)",
      fontWeight: "var(--weight-ui)",
      fontSize: s.fontSize,
      lineHeight: 1.2,
      whiteSpace: "nowrap",
      padding: s.padding,
      borderRadius: s.radius,
      border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? .42 : 1,
      transition: "background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)",
      transform: press && !disabled ? "scale(var(--press-scale))" : "none",
      ...v,
      background: hover && !disabled ? hoverBg : v.background,
      ...style
    }
  }, rest), icon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      width: s.icon,
      height: s.icon
    }
  }, icon) : null, children, iconRight ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      width: s.icon,
      height: s.icon
    }
  }, iconRight) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const tones = {
  milk: {
    background: "var(--surface-card)",
    color: "var(--text-body)"
  },
  paper: {
    background: "var(--surface-page)",
    color: "var(--text-body)"
  },
  warm: {
    background: "var(--surface-warm)",
    color: "var(--text-body)"
  },
  sage: {
    background: "var(--surface-sage)",
    color: "var(--text-body)"
  },
  rose: {
    background: "var(--surface-rose)",
    color: "var(--text-body)"
  },
  terracotta: {
    background: "var(--action-primary)",
    color: "var(--text-on-accent)"
  },
  night: {
    background: "var(--surface-inverse)",
    color: "var(--text-on-inverse)"
  },
  outline: {
    background: "transparent",
    color: "var(--text-body)",
    boxShadow: "inset 0 0 0 1px var(--border-hairline)"
  },
  dashed: {
    background: "transparent",
    color: "var(--text-body)",
    border: "1px dashed var(--border-dashed)"
  }
};

/* Cards separate from the page by fill, not by shadow. */
function Card({
  children,
  tone = "milk",
  padding = "var(--pad-card)",
  radius = "var(--radius-card)",
  eyebrow,
  title,
  style,
  ...rest
}) {
  const t = tones[tone] || tones.milk;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      borderRadius: radius,
      padding,
      boxSizing: "border-box",
      ...t,
      ...style
    }
  }, rest), eyebrow ? /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: "var(--space-2)",
      color: tone === "night" || tone === "terracotta" ? "var(--terracotta-night)" : "var(--text-eyebrow)"
    }
  }, eyebrow) : null, title ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--weight-display)",
      fontSize: "var(--size-body-lg)",
      lineHeight: 1.3,
      marginBottom: "var(--space-2)"
    }
  }, title) : null, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CDN = "https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/";

/* SUBSTITUTION: the brand supplied no icon set. Lucide (rounded caps, 2px stroke) is the
   closest match to the mark's geometry. Masked so the glyph always inherits currentColor. */
function Icon({
  name,
  size = 20,
  color = "currentColor",
  style,
  ...rest
}) {
  const url = "url(" + CDN + name + ".svg)";
  return /*#__PURE__*/React.createElement("span", _extends({
    "aria-hidden": "true",
    style: {
      display: "inline-block",
      width: size,
      height: size,
      flex: "0 0 auto",
      background: color,
      WebkitMaskImage: url,
      maskImage: url,
      WebkitMaskSize: "contain",
      maskSize: "contain",
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const box = {
  sm: 32,
  md: 40,
  lg: 48
};
const glyph = {
  sm: 16,
  md: 20,
  lg: 22
};
function IconButton({
  children,
  label,
  size = "md",
  variant = "ghost",
  disabled = false,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const bg = variant === "primary" ? "var(--action-primary)" : variant === "secondary" ? "var(--action-secondary)" : "transparent";
  const fg = variant === "primary" ? "var(--text-on-accent)" : "var(--text-body)";
  const hoverBg = variant === "primary" ? "var(--action-primary-hover)" : variant === "secondary" ? "var(--action-secondary-hover)" : "var(--action-ghost-hover)";
  return /*#__PURE__*/React.createElement("button", _extends({
    "aria-label": label,
    title: label,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: box[size],
      height: box[size],
      borderRadius: "var(--radius-md)",
      border: "none",
      background: hover && !disabled ? hoverBg : bg,
      color: fg,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? .42 : 1,
      boxShadow: variant === "secondary" ? "inset 0 0 0 1px var(--border-strong)" : "none",
      transition: "background var(--duration-fast) var(--ease-out)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      width: glyph[size],
      height: glyph[size]
    }
  }, children));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const files = {
  mark: "SVG/fonnus-mark.svg",
  "mark-mono": "SVG/fonnus-mark-mono.svg",
  "mark-dark": "SVG/fonnus-mark-dark.svg",
  horizontal: "SVG/fonnus-lockup-horizontal.svg",
  stacked: "SVG/fonnus-lockup-stacked.svg"
};

/* Clearspace = height of the arc. Below 24px the wordmark is dropped and only the mark is used. */
function Logo({
  variant = "horizontal",
  height = 32,
  assetBase = "assets",
  clearspace = false,
  style,
  ...rest
}) {
  const isMark = variant.startsWith("mark");
  const v = !isMark && height < 24 ? "mark" : variant;
  return /*#__PURE__*/React.createElement("img", _extends({
    src: assetBase + "/" + files[v],
    alt: "Fonnus",
    style: {
      height,
      width: "auto",
      display: "block",
      padding: clearspace ? height * 0.3 : 0,
      boxSizing: "content-box",
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Logo.jsx", error: String((e && e.message) || e) }); }

// components/core/SpeechBubble.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const tones = {
  assistant: {
    background: "var(--surface-warm)",
    align: "flex-start"
  },
  caller: {
    background: "var(--surface-card)",
    align: "center"
  },
  handoff: {
    background: "var(--surface-sage)",
    align: "flex-end"
  }
};

/* The three voice grounds from the identity deck: assistant (blush), caller (milk), handoff (sage). */
function SpeechBubble({
  children,
  speaker = "assistant",
  style,
  ...rest
}) {
  const t = tones[speaker] || tones.assistant;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      justifyContent: t.align,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      background: t.background,
      borderRadius: "var(--radius-lg)",
      padding: "18px 24px",
      maxWidth: "78%",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--size-body)",
      lineHeight: "var(--leading-body)",
      color: "var(--text-body)"
    }
  }, children));
}
Object.assign(__ds_scope, { SpeechBubble });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SpeechBubble.jsx", error: String((e && e.message) || e) }); }

// components/core/Stat.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Stat({
  label,
  value,
  unit,
  delta,
  deltaTone = "success",
  align = "left",
  size = "md",
  style,
  ...rest
}) {
  const sizes = {
    sm: "var(--size-num)",
    md: "28px",
    lg: "40px"
  };
  const toneColor = deltaTone === "success" ? "var(--success)" : deltaTone === "error" ? "var(--error)" : "var(--text-muted)";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
      alignItems: align === "right" ? "flex-end" : "flex-start",
      ...style
    }
  }, rest), label ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: "var(--size-ui)",
      color: "var(--text-muted)",
      lineHeight: 1.4
    }
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-num)",
      fontWeight: 600,
      fontVariantNumeric: "tabular-nums",
      fontFeatureSettings: '"tnum" 1',
      fontSize: sizes[size],
      lineHeight: 1.2,
      letterSpacing: "-.01em"
    }
  }, value), unit ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-num)",
      fontSize: "var(--size-body-sm)",
      color: "var(--text-muted)"
    }
  }, unit) : null), delta ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-num)",
      fontSize: "var(--size-ui)",
      fontVariantNumeric: "tabular-nums",
      color: toneColor
    }
  }, delta) : null);
}
Object.assign(__ds_scope, { Stat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Stat.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tag({
  children,
  selected = false,
  onRemove,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const interactive = !!onClick;
  return /*#__PURE__*/React.createElement("span", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 12px",
      borderRadius: "var(--radius-pill)",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--size-ui)",
      fontWeight: "var(--weight-ui)",
      lineHeight: 1.4,
      whiteSpace: "nowrap",
      cursor: interactive ? "pointer" : "default",
      background: selected ? "var(--action-primary)" : hover && interactive ? "var(--action-ghost-hover)" : "transparent",
      color: selected ? "var(--text-on-accent)" : "var(--text-body)",
      boxShadow: selected ? "none" : "inset 0 0 0 1px var(--border-strong)",
      transition: "background var(--duration-fast) var(--ease-out)",
      ...style
    }
  }, rest), children, onRemove ? /*#__PURE__*/React.createElement("span", {
    role: "button",
    "aria-label": "Xo\xE1",
    onClick: e => {
      e.stopPropagation();
      onRemove(e);
    },
    style: {
      opacity: .6,
      cursor: "pointer",
      fontSize: 14,
      lineHeight: 1
    }
  }, "\u2715") : null);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Dialog({
  open = true,
  title,
  description,
  children,
  footer,
  onClose,
  width = 440,
  style,
  ...rest
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    style: {
      position: "absolute",
      inset: 0,
      display: "grid",
      placeItems: "center",
      background: "rgba(38,31,24,.36)",
      backdropFilter: "blur(2px)",
      padding: "var(--space-6)",
      zIndex: 40
    }
  }, /*#__PURE__*/React.createElement("div", _extends({
    style: {
      width: "100%",
      maxWidth: width,
      background: "var(--surface-card)",
      borderRadius: "var(--radius-xl)",
      padding: "var(--space-6)",
      boxShadow: "var(--shadow-overlay)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--weight-display)",
      fontSize: "var(--size-subheading)",
      lineHeight: "var(--leading-subheading)"
    }
  }, title), onClose ? /*#__PURE__*/React.createElement("button", {
    "aria-label": "\u0110\xF3ng",
    onClick: onClose,
    style: {
      appearance: "none",
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--text-muted)",
      fontSize: 16,
      lineHeight: 1,
      padding: 4
    }
  }, "\u2715") : null), description ? /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: "var(--space-2)",
      marginBottom: 0,
      color: "var(--text-muted)",
      fontSize: "var(--size-body-sm)",
      lineHeight: 1.6
    }
  }, description) : null, children ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-5)"
    }
  }, children) : null, footer ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-6)",
      display: "flex",
      gap: "var(--space-3)",
      justifyContent: "flex-end"
    }
  }, footer) : null));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const tones = {
  neutral: {
    bg: "var(--surface-inverse)",
    fg: "var(--text-on-inverse)",
    mark: null
  },
  success: {
    bg: "var(--surface-sage)",
    fg: "var(--text-body)",
    mark: "✓"
  },
  error: {
    bg: "var(--surface-rose)",
    fg: "var(--text-body)",
    mark: "✕"
  }
};
function Toast({
  children,
  tone = "neutral",
  action,
  onClose,
  style,
  ...rest
}) {
  const t = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "status",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-3)",
      background: t.bg,
      color: t.fg,
      borderRadius: "var(--radius-md)",
      padding: "12px 16px",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--size-body-sm)",
      lineHeight: 1.5,
      boxShadow: "var(--shadow-overlay)",
      ...style
    }
  }, rest), t.mark ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: tone === "success" ? "var(--success)" : "var(--error)"
    }
  }, t.mark) : null, /*#__PURE__*/React.createElement("span", null, children), action ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 4
    }
  }, action) : null, onClose ? /*#__PURE__*/React.createElement("button", {
    "aria-label": "\u0110\xF3ng",
    onClick: onClose,
    style: {
      appearance: "none",
      background: "none",
      border: "none",
      color: "inherit",
      opacity: .6,
      cursor: "pointer",
      fontSize: 14,
      lineHeight: 1
    }
  }, "\u2715") : null);
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tooltip({
  children,
  content,
  side = "top",
  style,
  ...rest
}) {
  const [show, setShow] = React.useState(false);
  const pos = side === "bottom" ? {
    top: "calc(100% + 8px)"
  } : side === "left" ? {
    right: "calc(100% + 8px)",
    top: "50%",
    transform: "translateY(-50%)"
  } : side === "right" ? {
    left: "calc(100% + 8px)",
    top: "50%",
    transform: "translateY(-50%)"
  } : {
    bottom: "calc(100% + 8px)"
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      position: "relative",
      display: "inline-flex",
      ...style
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
    onFocus: () => setShow(true),
    onBlur: () => setShow(false)
  }, rest), children, show ? /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: "absolute",
      ...pos,
      left: pos.left || pos.right ? pos.left : "50%",
      transform: pos.transform || "translateX(-50%)",
      whiteSpace: "nowrap",
      zIndex: 50,
      background: "var(--surface-inverse)",
      color: "var(--text-on-inverse)",
      borderRadius: "var(--radius-sm)",
      padding: "6px 10px",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--size-ui)",
      lineHeight: 1.4
    }
  }, content) : null);
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  label,
  checked = false,
  onChange,
  disabled = false,
  hint,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? .5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      width: 20,
      height: 20,
      flex: "0 0 auto",
      marginTop: 2,
      borderRadius: "var(--radius-xs)",
      background: checked ? "var(--action-primary)" : "var(--surface-card)",
      boxShadow: checked ? "none" : "inset 0 0 0 1px var(--border-strong)",
      transition: "background var(--duration-fast) var(--ease-out)"
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: "absolute",
      inset: 0,
      opacity: 0,
      margin: 0,
      cursor: "inherit"
    }
  }, rest)), checked ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: "absolute",
      inset: 0,
      display: "grid",
      placeItems: "center",
      color: "var(--text-on-accent)",
      fontSize: 13,
      lineHeight: 1
    }
  }, "\u2713") : null), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: "var(--size-body-sm)",
      lineHeight: 1.5
    }
  }, label), hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--size-ui)",
      color: "var(--text-muted)"
    }
  }, hint) : null));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  label,
  hint,
  error,
  prefix,
  suffix,
  numeric = false,
  id,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const inputId = id || "in-" + Math.random().toString(36).slice(2, 7);
  const border = error ? "var(--error)" : focus ? "var(--focus-ring)" : "var(--border-strong)";
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: "var(--size-ui)",
      fontWeight: "var(--weight-ui)",
      color: "var(--text-body)"
    }
  }, label) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "var(--surface-card)",
      borderRadius: "var(--radius-md)",
      padding: "11px 14px",
      boxShadow: "inset 0 0 0 " + (focus ? "2px" : "1px") + " " + border,
      transition: "box-shadow var(--duration-fast) var(--ease-out)"
    }
  }, prefix ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)",
      display: "inline-flex"
    }
  }, prefix) : null, /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: numeric ? "var(--font-num)" : "var(--font-ui)",
      fontVariantNumeric: numeric ? "tabular-nums" : "normal",
      fontSize: "var(--size-body-sm)",
      lineHeight: 1.5,
      color: "var(--text-body)"
    }
  }, rest)), suffix ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)",
      fontFamily: "var(--font-num)",
      fontSize: "var(--size-body-sm)"
    }
  }, suffix) : null), error ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--size-ui)",
      color: "var(--error)"
    }
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--size-ui)",
      color: "var(--text-muted)"
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Radio({
  label,
  checked = false,
  onChange,
  name,
  value,
  disabled = false,
  hint,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? .5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      width: 20,
      height: 20,
      flex: "0 0 auto",
      marginTop: 2,
      borderRadius: "50%",
      background: "var(--surface-card)",
      boxShadow: checked ? "inset 0 0 0 6px var(--action-primary)" : "inset 0 0 0 1px var(--border-strong)",
      transition: "box-shadow var(--duration-fast) var(--ease-out)"
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "radio",
    name: name,
    value: value,
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: "absolute",
      inset: 0,
      opacity: 0,
      margin: 0,
      cursor: "inherit"
    }
  }, rest))), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: "var(--size-body-sm)",
      lineHeight: 1.5
    }
  }, label), hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--size-ui)",
      color: "var(--text-muted)"
    }
  }, hint) : null));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  label,
  hint,
  options = [],
  value,
  onChange,
  id,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const selectId = id || "sel-" + Math.random().toString(36).slice(2, 7);
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: selectId,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: "var(--size-ui)",
      fontWeight: "var(--weight-ui)"
    }
  }, label) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: selectId,
    value: value,
    onChange: onChange,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      appearance: "none",
      width: "100%",
      background: "var(--surface-card)",
      borderRadius: "var(--radius-md)",
      border: "none",
      outline: "none",
      padding: "11px 38px 11px 14px",
      boxShadow: "inset 0 0 0 " + (focus ? "2px" : "1px") + " " + (focus ? "var(--focus-ring)" : "var(--border-strong)"),
      fontFamily: "var(--font-ui)",
      fontSize: "var(--size-body-sm)",
      color: "var(--text-body)",
      cursor: "pointer"
    }
  }, rest), options.map(o => {
    const val = typeof o === "string" ? o : o.value;
    const lab = typeof o === "string" ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: val,
      value: val
    }, lab);
  })), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: "absolute",
      right: 14,
      pointerEvents: "none",
      color: "var(--text-muted)",
      fontSize: 11
    }
  }, "\u25BE")), hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--size-ui)",
      color: "var(--text-muted)"
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Switch({
  label,
  checked = false,
  onChange,
  disabled = false,
  hint,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "center",
      justifyContent: "space-between",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? .5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: "var(--size-body-sm)",
      fontWeight: "var(--weight-ui)"
    }
  }, label), hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--size-ui)",
      color: "var(--text-muted)"
    }
  }, hint) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      width: 44,
      height: 26,
      flex: "0 0 auto",
      borderRadius: "var(--radius-pill)",
      background: checked ? "var(--action-primary)" : "rgba(38,31,24,.16)",
      transition: "background var(--duration-base) var(--ease-out)"
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    role: "switch",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: "absolute",
      inset: 0,
      opacity: 0,
      margin: 0,
      cursor: "inherit"
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 3,
      left: checked ? 21 : 3,
      width: 20,
      height: 20,
      borderRadius: "50%",
      background: "var(--milk)",
      transition: "left var(--duration-base) var(--ease-arc)"
    }
  })));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tabs({
  items = [],
  value,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: "flex",
      gap: "var(--space-6)",
      borderBottom: "1px solid var(--border-hairline)",
      ...style
    }
  }, rest), items.map(it => {
    const val = typeof it === "string" ? it : it.value;
    const lab = typeof it === "string" ? it : it.label;
    const count = typeof it === "string" ? null : it.count;
    const active = val === value;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      role: "tab",
      "aria-selected": active,
      onClick: () => onChange && onChange(val),
      style: {
        appearance: "none",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "0 0 12px",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--font-ui)",
        fontSize: "var(--size-body-sm)",
        fontWeight: active ? 600 : "var(--weight-ui)",
        color: active ? "var(--text-body)" : "var(--text-muted)",
        boxShadow: active ? "inset 0 -2px 0 var(--action-primary)" : "none",
        transition: "color var(--duration-fast) var(--ease-out)"
      }
    }, lab, count != null ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-num)",
        fontVariantNumeric: "tabular-nums",
        fontSize: "var(--size-ui)",
        color: active ? "var(--text-accent)" : "var(--text-muted)"
      }
    }, count) : null);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// slides/SlideKit.jsx
try { (() => {
const {
  Card,
  Badge,
  Logo,
  Icon,
  Stat,
  SpeechBubble
} = window.FonnusDesignSystem_fc5f6d;

/* 1280×720 slide frame. Paper or night ground, 72px margin, no shadow. */
function Slide({
  children,
  tone = "paper",
  style
}) {
  const grounds = {
    paper: {
      background: "var(--paper)",
      color: "var(--ink)"
    },
    milk: {
      background: "var(--milk)",
      color: "var(--ink)"
    },
    blush: {
      background: "var(--blush)",
      color: "var(--ink)"
    },
    night: {
      background: "var(--night)",
      color: "var(--cream-night)"
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    "data-theme": tone === "night" ? "dark" : undefined,
    style: {
      width: 1280,
      height: 720,
      padding: "var(--slide-pad)",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      ...grounds[tone],
      ...style
    }
  }, children);
}
function SlideTitle({
  children,
  size = 44
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: size,
      lineHeight: 1.2,
      letterSpacing: "-.01em"
    }
  }, children);
}
function SlideLead({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      lineHeight: 1.6,
      color: "var(--text-muted)",
      maxWidth: "56ch",
      marginTop: 20
    }
  }, children);
}
function TitleSlide() {
  return /*#__PURE__*/React.createElement(Slide, null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto"
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    variant: "horizontal",
    height: 112,
    assetBase: "../assets"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 64
    }
  }, /*#__PURE__*/React.createElement(SlideTitle, {
    size: 40
  }, "B\u1ED9 nh\u1EADn di\u1EC7n th\u01B0\u01A1ng hi\u1EC7u"), /*#__PURE__*/React.createElement(SlideLead, null, "Chi\u1EBFn l\u01B0\u1EE3c, logo, m\xE0u s\u1EAFc, ch\u1EEF v\xE0 quy t\u1EAFc s\u1EED d\u1EE5ng."), /*#__PURE__*/React.createElement("div", {
    className: "num",
    style: {
      marginTop: 48,
      fontSize: 15,
      color: "var(--text-accent)",
      fontWeight: 600
    }
  }, "B\u1EA3n 1.0 \xB7 Th\xE1ng 8, 2026"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto"
    }
  }));
}
function SectionSlide({
  number = "PHẦN 4",
  title = "Chữ"
}) {
  return /*#__PURE__*/React.createElement(Slide, {
    tone: "night"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto"
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    variant: "mark-dark",
    height: 72,
    assetBase: "../assets"
  }), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      color: "var(--terracotta-night)",
      marginTop: 40
    }
  }, number), /*#__PURE__*/React.createElement(SlideTitle, {
    size: 64
  }, title)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto"
    }
  }));
}
function StatementSlide() {
  return /*#__PURE__*/React.createElement(Slide, {
    tone: "blush"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto",
      marginBottom: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "T\u1EA6M NH\xCCN 2030"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(SlideTitle, {
    size: 64
  }, "Fonnus l\xE0 l\u1EDBp l\u1EC5 t\xE2n", /*#__PURE__*/React.createElement("br", null), "c\u1EE7a kinh t\u1EBF Vi\u1EC7t Nam.")), /*#__PURE__*/React.createElement(SlideLead, null, "M\u1ECDi cu\u1ED9c g\u1ECDi \u0111\u1EBFn m\u1ED9t doanh nghi\u1EC7p \u0111\u1EC1u \u0111\u01B0\u1EE3c \u0111\xF3n \u2014 trong v\xF2ng ba ti\u1EBFng reo, b\u1EB1ng ti\u1EBFng Vi\u1EC7t, b\u1EA5t k\u1EC3 m\u1EA5y gi\u1EDD.")));
}
function CardGridSlide() {
  const cards = [["HÔM NAY", "Nha khoa & thẩm mỹ", "Phòng khám 1–2 cơ sở. Pilot cuối 2026.", "terracotta"], ["KẾ TIẾP", "Y tế mở rộng", "Mắt, tai mũi họng, nhi, sản.", "milk"], ["SAU ĐÓ", "Ngành sống bằng lịch hẹn", "Spa, gara, thú y, dạy thêm, luật.", "milk"], ["XA HƠN", "Doanh nghiệp siêu nhỏ", "Một người, một số máy, một Fonnus.", "dashed"]];
  return /*#__PURE__*/React.createElement(Slide, null, /*#__PURE__*/React.createElement(SlideTitle, null, "Con \u0111\u01B0\u1EDDng m\u1EDF r\u1ED9ng"), /*#__PURE__*/React.createElement(SlideLead, null, "M\u1ED7i b\u1EADc d\xF9ng l\u1EA1i c\xF9ng m\u1ED9t l\xF5i: nghe m\xE1y, hi\u1EC3u ti\u1EBFng Vi\u1EC7t, \u0111\u1EB7t \u0111\u01B0\u1EE3c c\xE1i h\u1EB9n, bi\u1EBFt l\xFAc n\xE0o chuy\u1EC3n ng\u01B0\u1EDDi."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 20,
      marginTop: "auto"
    }
  }, cards.map(c => /*#__PURE__*/React.createElement(Card, {
    key: c[1],
    tone: c[3],
    padding: "28px",
    radius: "var(--radius-xl)"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      color: c[3] === "terracotta" ? "var(--cream)" : "var(--text-eyebrow)"
    }
  }, c[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 24,
      lineHeight: 1.3,
      marginTop: 12
    }
  }, c[1]), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      lineHeight: 1.6,
      marginTop: 10,
      color: c[3] === "terracotta" ? "rgba(255,246,232,.86)" : "var(--text-muted)"
    }
  }, c[2])))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto"
    }
  }));
}
function NumberedSlide() {
  const rows = [["01", "Tỷ lệ cuộc gọi được đón", "Mẫu số là mọi lần điện thoại reo — kể cả 10 giờ đêm và ngày Tết."], ["02", "Số giờ chủ doanh nghiệp lấy lại", "Sản phẩm thật của Fonnus. Nếu con số này bằng không, chúng ta đã bán một món đồ chơi."], ["03", "Số cái hẹn giữ được", "Đặt lịch mà khách không đến thì chưa phải doanh thu."]];
  return /*#__PURE__*/React.createElement(Slide, null, /*#__PURE__*/React.createElement(SlideTitle, null, "Ba con s\u1ED1 ch\xFAng ta \u0111o"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16,
      marginTop: "auto"
    }
  }, rows.map(r => /*#__PURE__*/React.createElement(Card, {
    key: r[0],
    tone: "milk",
    padding: "26px 32px",
    radius: "var(--radius-xl)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 32,
      alignItems: "baseline"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      color: "var(--text-accent)",
      fontWeight: 600,
      fontSize: 20
    }
  }, r[0]), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 26,
      lineHeight: 1.3
    }
  }, r[1]), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      lineHeight: 1.6,
      color: "var(--text-muted)",
      marginTop: 6,
      maxWidth: "70ch"
    }
  }, r[2])))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto"
    }
  }));
}
function TableSlide() {
  const rows = [["Tiêu đề marketing", "Baloo 2 · 600", "44–64 px / 1.2", "Đừng để lỡ cuộc gọi nào"], ["Đề mục", "Baloo 2 · 600", "24–28 px / 1.3", "Lịch hẹn tuần này"], ["Chữ đọc", "Be Vietnam Pro · 400", "16 px / 1.65", "Fonnus tự giới thiệu là trợ lý AI."], ["Nhãn UI", "Be Vietnam Pro · 500", "13.5 px / 1.4", "Cuộc gọi đã xử lý"], ["Số tabular", "IBM Plex Sans · 500 · tnum", "15–20 px / 1.4", "1.250.000 đ · 090 123 45 67"]];
  return /*#__PURE__*/React.createElement(Slide, null, /*#__PURE__*/React.createElement(SlideTitle, null, "Thang ch\u1EEF"), /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      marginTop: 44
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, ["VAI TRÒ", "FONT / WEIGHT", "CỠ / LINE-HEIGHT", "MẪU"].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      textAlign: "left",
      padding: "0 0 14px",
      fontSize: 12,
      letterSpacing: ".16em",
      fontWeight: 600,
      color: "var(--text-muted)"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, rows.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r[0],
    style: {
      borderTop: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "18px 24px 18px 0",
      fontWeight: 600,
      fontSize: 17
    }
  }, r[0]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "18px 24px 18px 0",
      color: "var(--text-muted)",
      fontSize: 17
    }
  }, r[1]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "18px 24px 18px 0",
      color: "var(--text-muted)",
      fontSize: 17,
      fontFamily: "var(--font-num)"
    }
  }, r[2]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "18px 0",
      fontSize: 19,
      fontFamily: r[0] === "Số tabular" ? "var(--font-num)" : r[0].indexOf("Tiêu") === 0 || r[0] === "Đề mục" ? "var(--font-display)" : "var(--font-ui)",
      fontWeight: r[0] === "Chữ đọc" ? 400 : 600,
      fontVariantNumeric: "tabular-nums"
    }
  }, r[3]))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto",
      fontSize: 16,
      lineHeight: 1.6,
      color: "var(--text-muted)"
    }
  }, "Hai lu\u1EADt ri\xEAng cho ti\u1EBFng Vi\u1EC7t: ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--text-body)"
    }
  }, "line-height kh\xF4ng bao gi\u1EDD d\u01B0\u1EDBi 1.2"), " k\u1EC3 c\u1EA3 ti\xEAu \u0111\u1EC1, v\xE0 ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--text-body)"
    }
  }, "tr\xE1nh VI\u1EBET HOA TO\xC0N B\u1ED8 cho c\xE2u d\xE0i"), " \u2014 d\u1EA5u tr\xEAn ch\u1EEF hoa \u0111\u1ED9i cao, d\u1EC5 ch\u1EA1m d\xF2ng tr\xEAn."));
}
function DoDontSlide() {
  const yes = ["Khoảng trống quanh logo tối thiểu bằng chiều cao vòng cung.", "Dưới 24 px chỉ dùng mark; wordmark từ 24 px trở lên.", "Vòng cung là hoạ tiết và ngôn ngữ chuyển động — luôn đúng bán kính, đúng độ dày.", "In một màu khi ngân sách hẹp: bản mực hoặc bản kem, không pha “gần giống”."];
  const no = ["Gradient tím-xanh “AI” — cấm tuyệt đối, kể cả trong deck.", "Kéo giãn wordmark cho vừa chỗ — đổi cỡ, không đổi tỷ lệ.", "Thêm sóng âm, sparkle hay bất kỳ “phụ kiện AI” quanh mark.", "Xoay hoặc lật mark — vòng cung mất nghĩa “dấu thanh” ngay khi nghiêng."];
  const col = (title, items, tone, color) => /*#__PURE__*/React.createElement(Card, {
    tone: tone,
    padding: "36px",
    radius: "var(--radius-xl)",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 26,
      color: color
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 18,
      marginTop: 24
    }
  }, items.map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      fontSize: 17,
      lineHeight: 1.6
    }
  }, i))));
  return /*#__PURE__*/React.createElement(Slide, null, /*#__PURE__*/React.createElement(SlideTitle, null, "N\xEAn v\xE0 kh\xF4ng n\xEAn"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 24,
      marginTop: 44
    }
  }, col("✓ Nên", yes, "sage", "var(--success)"), col("✕ Không nên", no, "milk", "var(--error)")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto"
    }
  }));
}
function VoiceSlide() {
  return /*#__PURE__*/React.createElement(Slide, null, /*#__PURE__*/React.createElement(SlideTitle, null, "Gi\u1ECDng n\xF3i"), /*#__PURE__*/React.createElement(SlideLead, null, "Ti\u1EBFng Vi\u1EC7t tr\u01B0\u1EDBc. C\xE2u ng\u1EAFn. Lu\xF4n t\u1EF1 gi\u1EDBi thi\u1EC7u l\xE0 tr\u1EE3 l\xFD AI ngay \u0111\u1EA7u cu\u1ED9c g\u1ECDi \u2014 n\xF3i to, kh\xF4ng gi\u1EA5u."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 20,
      marginTop: "auto"
    }
  }, /*#__PURE__*/React.createElement(SpeechBubble, {
    speaker: "assistant"
  }, "\"Ph\xF2ng kh\xE1m Nha khoa Minh Anh xin nghe. Em l\xE0 Fonnus, tr\u1EE3 l\xFD AI c\u1EE7a ph\xF2ng kh\xE1m. Anh ch\u1ECB c\u1EA7n \u0111\u1EB7t l\u1ECBch hay h\u1ECFi th\xF4ng tin \u1EA1?\""), /*#__PURE__*/React.createElement(SpeechBubble, {
    speaker: "caller"
  }, "\"C\u1EA1o v\xF4i r\u0103ng t\u1EA1i ph\xF2ng kh\xE1m l\xE0 ", /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      fontWeight: 600
    }
  }, "300.000 \u0111"), ". Ch\u1ECB mu\u1ED1n em gi\u1EEF l\u1ECBch 9 gi\u1EDD s\xE1ng th\u1EE9 B\u1EA3y kh\xF4ng?\""), /*#__PURE__*/React.createElement(SpeechBubble, {
    speaker: "handoff"
  }, "\"C\xE2u n\xE0y em xin ph\xE9p chuy\u1EC3n cho b\xE1c s\u0129 tr\u1EA3 l\u1EDDi tr\u1EF1c ti\u1EBFp. Em n\u1ED1i m\xE1y ngay \u1EA1.\"")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto"
    }
  }));
}
function ClosingSlide() {
  return /*#__PURE__*/React.createElement(Slide, {
    tone: "night",
    style: {
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    variant: "mark-dark",
    height: 96,
    assetBase: "../assets"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 44,
      marginTop: 40,
      textAlign: "center"
    }
  }, "Kh\xF4ng cu\u1ED9c g\u1ECDi n\xE0o b\u1ECB b\u1ECF l\u1EE1."), /*#__PURE__*/React.createElement("div", {
    className: "num",
    style: {
      marginTop: 20,
      color: "var(--terracotta-night)",
      fontSize: 15
    }
  }, "fonnus.ai \xB7 090 123 45 67"));
}
Object.assign(window, {
  Slide,
  SlideTitle,
  SlideLead,
  TitleSlide,
  SectionSlide,
  StatementSlide,
  CardGridSlide,
  NumberedSlide,
  TableSlide,
  DoDontSlide,
  VoiceSlide,
  ClosingSlide
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "slides/SlideKit.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/DashboardApp.jsx
try { (() => {
const {
  Toast
} = window.FonnusDesignSystem_fc5f6d;
function DashboardApp() {
  const [logged, setLogged] = React.useState(false);
  const [tab, setTab] = React.useState("home");
  const [call, setCall] = React.useState(null);
  const [dark, setDark] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const say = m => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };
  let screen;
  if (!logged) screen = /*#__PURE__*/React.createElement(LoginScreen, {
    onDone: () => setLogged(true)
  });else if (call) screen = /*#__PURE__*/React.createElement(CallDetail, {
    call: call,
    onBack: () => setCall(null),
    onToast: say
  });else if (tab === "home") screen = /*#__PURE__*/React.createElement(HomeScreen, {
    onOpen: setCall
  });else if (tab === "calls") screen = /*#__PURE__*/React.createElement(CallsScreen, {
    onOpen: setCall
  });else if (tab === "book") screen = /*#__PURE__*/React.createElement(BookScreen, null);else screen = /*#__PURE__*/React.createElement(SetScreen, {
    dark: dark,
    onDark: setDark,
    onToast: say
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 48,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Phone, {
    dark: dark
  }, screen, logged && !call ? /*#__PURE__*/React.createElement(TabBar, {
    tab: tab,
    onTab: setTab
  }) : null, toast ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: 110,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Toast, {
    tone: "success"
  }, toast)) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 300
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "DASHBOARD TR\xCAN \u0110I\u1EC6N THO\u1EA0I"), /*#__PURE__*/React.createElement("h3", {
    style: {
      marginTop: 8
    }
  }, "Ch\u1EE7 ph\xF2ng kh\xE1m m\u1EDF app m\u1ED9t l\u1EA7n m\u1ED7i t\u1ED1i"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-muted)",
      fontSize: "var(--size-body-sm)",
      marginTop: 12
    }
  }, "\u0110\u0103ng nh\u1EADp b\u1EB1ng s\u1ED1 \u0111i\u1EC7n tho\u1EA1i \u2192 m\xE3 Zalo. Sau \u0111\xF3: H\xF4m nay, danh s\xE1ch cu\u1ED9c g\u1ECDi, n\u1ED9i dung t\u1EEBng cu\u1ED9c, l\u1ECBch h\u1EB9n, c\xE0i \u0111\u1EB7t b\u1EA3ng gi\xE1."), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-muted)",
      fontSize: "var(--size-ui)",
      marginTop: 12
    }
  }, "R\u1EE7i ro c\u1EE7a b\u1EC1 m\u1EB7t n\xE0y: \u0111\u1EA5t nung #B85C2B ch\u1EC9 \u0111\u1EA1t 4.0:1, n\xEAn m\u1ECDi tr\u1EA1ng th\xE1i v\xE0 link \u1EDF c\u1EE1 ch\u1EEF nh\u1ECF d\xF9ng b\u1EADc \u0111\u1EADm #8A4118. B\u1EADt \"Giao di\u1EC7n t\u1ED1i\" trong C\xE0i \u0111\u1EB7t \u0111\u1EC3 xem b\u1EA3ng m\xE0u \u0111\xEAm.")));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(DashboardApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/DashboardApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/DashboardScreens.jsx
try { (() => {
const {
  Button,
  IconButton,
  Card,
  Badge,
  Tag,
  Stat,
  Icon,
  Logo,
  SpeechBubble,
  Tabs,
  Input,
  Select,
  Switch,
  Checkbox,
  Dialog,
  Toast,
  Tooltip
} = window.FonnusDesignSystem_fc5f6d;
const CALLS = [{
  id: 1,
  name: "Số lạ · 0912 445 118",
  time: "21:42",
  dur: "1:24",
  tone: "success",
  state: "Đã đặt lịch",
  summary: "Hỏi giá cạo vôi răng — giữ lịch 9:00 thứ Bảy.",
  service: "Cạo vôi răng",
  price: "300.000"
}, {
  id: 2,
  name: "Chị Hoa · 0903 771 240",
  time: "20:15",
  dur: "2:06",
  tone: "lemongrass",
  state: "Chuyển bác sĩ",
  summary: "Đau răng ba ngày — chuyển cho bác sĩ Nam.",
  service: "Khám tổng quát",
  price: "—"
}, {
  id: 3,
  name: "Số lạ · 0977 018 552",
  time: "19:58",
  dur: "0:48",
  tone: "neutral",
  state: "Đã trả lời",
  summary: "Hỏi giờ làm việc chủ nhật.",
  service: "—",
  price: "—"
}, {
  id: 4,
  name: "Anh Dũng · 0938 112 907",
  time: "18:30",
  dur: "0:12",
  tone: "error",
  state: "Cần gọi lại",
  summary: "Khách cúp máy khi Fonnus đang đọc bảng giá.",
  service: "Implant",
  price: "18.000.000"
}];
function Phone({
  children,
  dark = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    "data-theme": dark ? "dark" : undefined,
    style: {
      width: 390,
      height: 844,
      borderRadius: 44,
      background: dark ? "var(--night)" : "var(--surface-page)",
      boxShadow: "0 24px 60px rgba(38,31,24,.18), inset 0 0 0 1px var(--border-hairline)",
      overflow: "hidden",
      position: "relative",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      flex: "0 0 auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 26px",
      fontFamily: "var(--font-num)",
      fontSize: 13,
      fontWeight: 600,
      color: "var(--text-body)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "9:41"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      opacity: .55
    }
  }, [6, 9, 12].map(h => /*#__PURE__*/React.createElement("span", {
    key: h,
    style: {
      width: 3,
      height: h,
      borderRadius: 1,
      background: "currentColor"
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 11,
      borderRadius: 3,
      boxShadow: "inset 0 0 0 1px currentColor",
      padding: 2,
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      background: "currentColor",
      borderRadius: 1
    }
  })))), children);
}
function TopBar({
  title,
  right,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-2) var(--space-5) var(--space-4)",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: "var(--size-heading)",
      lineHeight: 1.3
    }
  }, title), sub ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--size-ui)",
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, sub) : null), right);
}
function TabBar({
  tab,
  onTab
}) {
  const items = [["home", "house", "Hôm nay"], ["calls", "phone-call", "Cuộc gọi"], ["book", "calendar-check", "Lịch hẹn"], ["set", "settings", "Cài đặt"]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto",
      flex: "0 0 auto",
      borderTop: "1px solid var(--border-hairline)",
      background: "var(--surface-card)",
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      padding: "10px 8px 26px"
    }
  }, items.map(([k, ic, lab]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => onTab(k),
    style: {
      appearance: "none",
      background: "none",
      border: "none",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 5,
      padding: "6px 0",
      color: tab === k ? "var(--text-accent)" : "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 22
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: 11,
      fontWeight: tab === k ? 600 : 500
    }
  }, lab))));
}
function CallRow({
  call,
  onOpen
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(call),
    style: {
      appearance: "none",
      textAlign: "left",
      width: "100%",
      background: "var(--surface-card)",
      border: "none",
      borderRadius: "var(--radius-lg)",
      padding: "14px 16px",
      cursor: "pointer",
      display: "flex",
      gap: 12,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: "var(--radius-md)",
      background: "var(--surface-warm)",
      display: "grid",
      placeItems: "center",
      flex: "0 0 auto"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: call.tone === "error" ? "phone-missed" : "phone-incoming",
    size: 18,
    color: "var(--terracotta-deep)"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-ui)",
      fontWeight: 600,
      fontSize: "var(--size-body-sm)"
    }
  }, call.name), /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      fontSize: "var(--size-ui)",
      color: "var(--text-muted)",
      marginLeft: "auto"
    }
  }, call.time)), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontSize: "var(--size-ui)",
      color: "var(--text-muted)",
      lineHeight: 1.5,
      marginTop: 3
    }
  }, call.summary), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: call.tone,
    dot: call.tone === "success"
  }, call.state), /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      fontSize: "var(--size-ui)",
      color: "var(--text-muted)"
    }
  }, call.dur))));
}
function LoginScreen({
  onDone
}) {
  const [step, setStep] = React.useState("phone");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      padding: "var(--space-8) var(--space-6) var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    variant: "horizontal",
    height: 26,
    assetBase: "../../assets"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 32,
      lineHeight: 1.2
    }
  }, step === "phone" ? "Nhập số điện thoại phòng khám" : "Nhập mã xác thực"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-muted)",
      fontSize: "var(--size-body-sm)",
      marginTop: "var(--space-3)"
    }
  }, step === "phone" ? "Đây là số bệnh nhân đang gọi. Fonnus nghe máy trên chính số này." : "Fonnus vừa gửi 6 số qua Zalo tới 090 123 45 67."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-6)"
    }
  }, step === "phone" ? /*#__PURE__*/React.createElement(Input, {
    label: "S\u1ED1 \u0111i\u1EC7n tho\u1EA1i",
    numeric: true,
    defaultValue: "090 123 45 67",
    prefix: /*#__PURE__*/React.createElement(Icon, {
      name: "phone",
      size: 16
    })
  }) : /*#__PURE__*/React.createElement(Input, {
    label: "M\xE3 x\xE1c th\u1EF1c",
    numeric: true,
    placeholder: "\u2022 \u2022 \u2022 \u2022 \u2022 \u2022"
  })), /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    size: "lg",
    style: {
      marginTop: "var(--space-6)"
    },
    onClick: () => step === "phone" ? setStep("otp") : onDone()
  }, step === "phone" ? "Gửi mã xác thực" : "Đăng nhập"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--size-ui)",
      color: "var(--text-muted)",
      marginTop: "var(--space-4)",
      textAlign: "center"
    }
  }, step === "otp" ? /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      setStep("phone");
    }
  }, "\u0110\u1ED5i s\u1ED1 \u0111i\u1EC7n tho\u1EA1i") : "Chưa có tài khoản? Gọi 1900 6060.")));
}
function HomeScreen({
  onOpen
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: "auto",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: "H\xF4m nay",
    sub: "Nha khoa Minh Anh \xB7 C\u01A1 s\u1EDF Qu\u1EADn 1",
    right: /*#__PURE__*/React.createElement(Badge, {
      tone: "success",
      dot: true
    }, "\u0110ang nghe m\xE1y")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 var(--space-5)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "warm",
    padding: "var(--space-5)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Cu\u1ED9c g\u1ECDi \u0111\xE3 nghe",
    value: "24"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "L\u1ECBch h\u1EB9n gi\u1EEF \u0111\u01B0\u1EE3c",
    value: "7"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "C\u1EA7n g\u1ECDi l\u1EA1i",
    value: "1",
    align: "right"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-4)",
      paddingTop: "var(--space-4)",
      borderTop: "1px solid var(--border-hairline)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--size-ui)",
      color: "var(--text-muted)"
    }
  }, "Doanh thu gi\u1EEF l\u1EA1i tu\u1EA7n n\xE0y"), /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      fontWeight: 600
    }
  }, "18.400.000 \u0111"))), /*#__PURE__*/React.createElement(Card, {
    tone: "sage",
    padding: "var(--space-5)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 20,
    color: "var(--lemongrass)"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-ui)",
      fontWeight: 600,
      fontSize: "var(--size-body-sm)"
    }
  }, "Fonnus \u0111\xE3 tr\u1EA3 b\u1EA1n l\u1EA1i 3 gi\u1EDD 20 ph\xFAt h\xF4m nay"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--size-ui)",
      color: "var(--text-muted)",
      marginTop: 3
    }
  }, "T\xEDnh tr\xEAn th\u1EDDi l\u01B0\u1EE3ng cu\u1ED9c g\u1ECDi l\u1EC5 t\xE2n kh\xF4ng ph\u1EA3i nghe.")))), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginTop: "var(--space-3)"
    }
  }, "CU\u1ED8C G\u1ECCI G\u1EA6N NH\u1EA4T"), CALLS.slice(0, 3).map(c => /*#__PURE__*/React.createElement(CallRow, {
    key: c.id,
    call: c,
    onOpen: onOpen
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 20
    }
  }));
}
function CallsScreen({
  onOpen
}) {
  const [tab, setTab] = React.useState("all");
  const list = tab === "all" ? CALLS : tab === "missed" ? CALLS.filter(c => c.tone === "error") : CALLS.filter(c => c.state === "Đã đặt lịch");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: "auto",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: "Cu\u1ED9c g\u1ECDi",
    right: /*#__PURE__*/React.createElement(IconButton, {
      label: "T\xECm ki\u1EBFm",
      variant: "secondary"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 18
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    items: [{
      value: "all",
      label: "Tất cả",
      count: 24
    }, {
      value: "booked",
      label: "Đã đặt lịch",
      count: 7
    }, {
      value: "missed",
      label: "Cần gọi lại",
      count: 1
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
      marginTop: "var(--space-5)"
    }
  }, list.map(c => /*#__PURE__*/React.createElement(CallRow, {
    key: c.id,
    call: c,
    onOpen: onOpen
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 20
    }
  }));
}
function CallDetail({
  call,
  onBack,
  onToast
}) {
  const [confirm, setConfirm] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: "auto",
      display: "flex",
      flexDirection: "column",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-2) var(--space-5) var(--space-4)",
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    label: "Quay l\u1EA1i",
    onClick: onBack
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: "var(--size-subheading)"
    }
  }, "Chi ti\u1EBFt cu\u1ED9c g\u1ECDi")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 var(--space-5)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "milk",
    padding: "var(--space-5)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-ui)",
      fontWeight: 600
    }
  }, call.name), /*#__PURE__*/React.createElement("div", {
    className: "num",
    style: {
      fontSize: "var(--size-ui)",
      color: "var(--text-muted)",
      marginTop: 3
    }
  }, "H\xF4m nay ", call.time, " \xB7 ", call.dur)), /*#__PURE__*/React.createElement(Badge, {
    tone: call.tone,
    dot: call.tone === "success"
  }, call.state)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-2)",
      marginTop: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "phone-call",
      size: 16
    }),
    onClick: () => onToast("Đang gọi lại " + call.name.split("· ")[1])
  }, "G\u1ECDi l\u1EA1i"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    onClick: () => setConfirm(true)
  }, "Chuy\u1EC3n b\xE1c s\u0129"))), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "N\u1ED8I DUNG CU\u1ED8C G\u1ECCI"), /*#__PURE__*/React.createElement(SpeechBubble, {
    speaker: "assistant"
  }, "\"Ph\xF2ng kh\xE1m Nha khoa Minh Anh xin nghe. Em l\xE0 Fonnus, tr\u1EE3 l\xFD AI c\u1EE7a ph\xF2ng kh\xE1m. Anh ch\u1ECB c\u1EA7n \u0111\u1EB7t l\u1ECBch hay h\u1ECFi th\xF4ng tin \u1EA1?\""), /*#__PURE__*/React.createElement(SpeechBubble, {
    speaker: "caller"
  }, "\"Cho h\u1ECFi c\u1EA1o v\xF4i r\u0103ng bao nhi\xEAu ti\u1EC1n em?\""), /*#__PURE__*/React.createElement(SpeechBubble, {
    speaker: "assistant"
  }, "\"C\u1EA1o v\xF4i r\u0103ng t\u1EA1i ph\xF2ng kh\xE1m l\xE0 ", /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, "300.000 \u0111"), ". Ch\u1ECB mu\u1ED1n em gi\u1EEF l\u1ECBch 9 gi\u1EDD s\xE1ng th\u1EE9 B\u1EA3y kh\xF4ng?\""), /*#__PURE__*/React.createElement(SpeechBubble, {
    speaker: "handoff"
  }, "\"Em \u0111\xE3 ghi l\u1ECBch 9:00 th\u1EE9 B\u1EA3y cho ch\u1ECB. S\xE1ng mai l\u1EC5 t\xE2n s\u1EBD g\u1ECDi x\xE1c nh\u1EADn l\u1EA1i \u1EA1.\""), /*#__PURE__*/React.createElement(Card, {
    tone: "milk",
    padding: "var(--space-5)"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "FONNUS GHI L\u1EA0I"), /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      marginTop: 10,
      borderCollapse: "collapse",
      fontSize: "var(--size-body-sm)"
    }
  }, /*#__PURE__*/React.createElement("tbody", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    style: {
      color: "var(--text-muted)",
      padding: "5px 0"
    }
  }, "D\u1ECBch v\u1EE5"), /*#__PURE__*/React.createElement("td", {
    style: {
      textAlign: "right",
      fontWeight: 600
    }
  }, call.service)), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    style: {
      color: "var(--text-muted)",
      padding: "5px 0"
    }
  }, "Gi\xE1 \u0111\xE3 \u0111\u1ECDc"), /*#__PURE__*/React.createElement("td", {
    className: "num",
    style: {
      textAlign: "right",
      fontWeight: 600
    }
  }, call.price === "—" ? "—" : call.price + " đ")), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    style: {
      color: "var(--text-muted)",
      padding: "5px 0"
    }
  }, "L\u1ECBch h\u1EB9n"), /*#__PURE__*/React.createElement("td", {
    style: {
      textAlign: "right",
      fontWeight: 600
    }
  }, "9:00 \xB7 Th\u1EE9 B\u1EA3y 29/8")))))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 20
    }
  }), /*#__PURE__*/React.createElement(Dialog, {
    open: confirm,
    title: "Chuy\u1EC3n cu\u1ED9c g\u1ECDi cho b\xE1c s\u0129?",
    description: "Fonnus s\u1EBD n\u1ED1i m\xE1y ngay v\xE0 ghi l\u1EA1i l\xFD do chuy\u1EC3n v\xE0o l\u1ECBch s\u1EED cu\u1ED9c g\u1ECDi.",
    onClose: () => setConfirm(false),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      onClick: () => setConfirm(false)
    }, "Hu\u1EF7"), /*#__PURE__*/React.createElement(Button, {
      onClick: () => {
        setConfirm(false);
        onToast("Đã chuyển cho bác sĩ Nam");
      }
    }, "N\u1ED1i m\xE1y"))
  }, /*#__PURE__*/React.createElement(Select, {
    label: "B\xE1c s\u0129 nh\u1EADn",
    options: ["BS. Nguyễn Văn Nam", "BS. Trần Thu Hà"]
  })));
}
function BookScreen() {
  const rows = [["9:00", "Chị Hoa · Cạo vôi răng", "success", "Đã xác nhận"], ["10:30", "Anh Dũng · Tư vấn implant", "warning", "Chờ xác nhận"], ["14:00", "Bé An · Khám định kỳ", "success", "Đã xác nhận"], ["16:15", "Chị Trâm · Tẩy trắng", "neutral", "Fonnus sẽ nhắc"]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: "auto",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: "L\u1ECBch h\u1EB9n",
    sub: "Th\u1EE9 B\u1EA3y \xB7 29 th\xE1ng 8",
    right: /*#__PURE__*/React.createElement(IconButton, {
      label: "Th\xEAm l\u1ECBch",
      variant: "primary"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 20
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 var(--space-5)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "warm",
    padding: "var(--space-5)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "C\xE1i h\u1EB9n h\xF4m nay",
    value: "7"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Kh\xE1ch kh\xF4ng \u0111\u1EBFn tu\u1EA7n n\xE0y",
    value: "2",
    align: "right"
  }))), rows.map(r => /*#__PURE__*/React.createElement(Card, {
    key: r[0],
    tone: "milk",
    padding: "var(--space-4)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      fontWeight: 600,
      fontSize: "var(--size-num-lg)",
      width: 56
    }
  }, r[0]), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: "var(--size-body-sm)"
    }
  }, r[1]), /*#__PURE__*/React.createElement(Badge, {
    tone: r[2]
  }, r[3]))))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 20
    }
  }));
}
function SetScreen({
  dark,
  onDark,
  onToast
}) {
  const [ah, setAh] = React.useState(true);
  const [zalo, setZalo] = React.useState(true);
  const [ai, setAi] = React.useState(true);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: "auto",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: "C\xE0i \u0111\u1EB7t",
    sub: "Nha khoa Minh Anh"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 var(--space-5)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "milk",
    padding: "var(--space-5)"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "NGHE M\xC1Y"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)",
      marginTop: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    label: "Nghe m\xE1y ngo\xE0i gi\u1EDD",
    hint: "22:00 \u2013 07:00",
    checked: ah,
    onChange: () => setAh(!ah)
  }), /*#__PURE__*/React.createElement(Switch, {
    label: "Nh\u1EAFc kh\xE1ch tr\u01B0\u1EDBc gi\u1EDD h\u1EB9n",
    hint: "G\u1EEDi qua Zalo",
    checked: zalo,
    onChange: () => setZalo(!zalo)
  }), /*#__PURE__*/React.createElement(Switch, {
    label: "C\xF4ng b\u1ED1 l\xE0 tr\u1EE3 l\xFD AI \u1EDF \u0111\u1EA7u cu\u1ED9c g\u1ECDi",
    hint: "B\u1EAFt bu\u1ED9c \u2014 kh\xF4ng th\u1EC3 t\u1EAFt trong b\u1EA3n pilot",
    checked: ai,
    onChange: () => {
      setAi(true);
      onToast("Câu công bố AI là bắt buộc");
    }
  }))), /*#__PURE__*/React.createElement(Card, {
    tone: "milk",
    padding: "var(--space-5)"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "B\u1EA2NG GI\xC1 FONNUS \u0110\u1ECCC"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)",
      marginTop: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "C\u1EA1o v\xF4i r\u0103ng",
    numeric: true,
    defaultValue: "300.000",
    suffix: "\u0111"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Tr\u1ED3ng r\u0103ng implant (t\u1EEB)",
    numeric: true,
    defaultValue: "18.000.000",
    suffix: "\u0111"
  }), /*#__PURE__*/React.createElement(Select, {
    label: "C\u01A1 s\u1EDF",
    options: ["Cơ sở Quận 1", "Cơ sở Quận 7"]
  }))), /*#__PURE__*/React.createElement(Card, {
    tone: "milk",
    padding: "var(--space-5)"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "GIAO DI\u1EC6N"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    label: "Giao di\u1EC7n t\u1ED1i",
    hint: "N\u1EC1n n\xE2u \u0111\xEAm \u1EA5m cho ca tr\u1EF1c bu\u1ED5i t\u1ED1i",
    checked: dark,
    onChange: () => onDark(!dark)
  }))), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    fullWidth: true
  }, "\u0110\u0103ng xu\u1EA5t")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 20
    }
  }));
}
Object.assign(window, {
  Phone,
  TabBar,
  LoginScreen,
  HomeScreen,
  CallsScreen,
  CallDetail,
  BookScreen,
  SetScreen,
  CALLS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/DashboardScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/LandingPage.jsx
try { (() => {
const {
  Button,
  Dialog,
  Input,
  Icon,
  Toast
} = window.FonnusDesignSystem_fc5f6d;
function LandingPage() {
  const [demo, setDemo] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      minHeight: "100vh"
    }
  }, /*#__PURE__*/React.createElement(Header, {
    onDemo: () => setDemo(true)
  }), /*#__PURE__*/React.createElement(Hero, {
    onDemo: () => setDemo(true)
  }), /*#__PURE__*/React.createElement(Steps, null), /*#__PURE__*/React.createElement(Scripts, null), /*#__PURE__*/React.createElement(Numbers, null), /*#__PURE__*/React.createElement(Pricing, null), /*#__PURE__*/React.createElement(Footer, null), /*#__PURE__*/React.createElement(Dialog, {
    open: demo,
    width: 420,
    title: "\u0110\u1EC3 Fonnus g\u1ECDi cho b\u1EA1n",
    description: "Nh\u1EADp s\u1ED1 \u0111i\u1EC7n tho\u1EA1i \u2014 Fonnus s\u1EBD g\u1ECDi trong v\xF2ng m\u1ED9t ph\xFAt v\xE0 n\xF3i \u0111\xFAng nh\u01B0 tr\xEAn trang n\xE0y.",
    onClose: () => setDemo(false),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      onClick: () => setDemo(false)
    }, "\u0110\u1EC3 sau"), /*#__PURE__*/React.createElement(Button, {
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "phone-call",
        size: 16
      }),
      onClick: () => {
        setDemo(false);
        setSent(true);
        setTimeout(() => setSent(false), 3200);
      }
    }, "G\u1ECDi cho t\xF4i"))
  }, /*#__PURE__*/React.createElement(Input, {
    label: "S\u1ED1 \u0111i\u1EC7n tho\u1EA1i",
    numeric: true,
    placeholder: "090 123 45 67"
  })), sent ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      bottom: 24,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 50
    }
  }, /*#__PURE__*/React.createElement(Toast, {
    tone: "success"
  }, "Fonnus s\u1EBD g\u1ECDi cho b\u1EA1n trong m\u1ED9t ph\xFAt")) : null);
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(LandingPage, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/LandingPage.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/LandingSections.jsx
try { (() => {
const {
  Button,
  Card,
  Badge,
  Tag,
  Stat,
  Icon,
  Logo,
  SpeechBubble,
  Tabs,
  Input,
  Select,
  Switch,
  Dialog
} = window.FonnusDesignSystem_fc5f6d;
function Header({
  onDemo
}) {
  const links = ["Cách hoạt động", "Giá", "Câu hỏi", "Blog"];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 20,
      background: "rgba(247,239,225,.88)",
      backdropFilter: "blur(8px)",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: 72
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    variant: "horizontal",
    height: 26,
    assetBase: "../../assets"
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      gap: "var(--space-8)",
      alignItems: "center"
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      fontSize: "var(--size-body-sm)",
      fontWeight: 500,
      color: "var(--text-muted)"
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-3)",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm"
  }, "\u0110\u0103ng nh\u1EADp"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    onClick: onDemo,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "phone-call",
      size: 16
    })
  }, "Nghe th\u1EED"))));
}
function Hero({
  onDemo
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "wrap",
    style: {
      padding: "var(--space-24) 0 var(--space-20)",
      display: "grid",
      gridTemplateColumns: "1.05fr .95fr",
      gap: "var(--space-16)",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "TR\u1EE2 L\xDD AI NGHE \u0110I\u1EC6N THO\u1EA0I"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: "var(--size-hero)",
      lineHeight: "var(--leading-hero)",
      marginTop: "var(--space-4)"
    }
  }, "Kh\xF4ng cu\u1ED9c g\u1ECDi n\xE0o b\u1ECB b\u1ECF l\u1EE1."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--size-body-lg)",
      lineHeight: "var(--leading-body-lg)",
      color: "var(--text-muted)",
      maxWidth: "46ch",
      marginTop: "var(--space-5)"
    }
  }, "B\u1EC7nh nh\xE2n g\u1ECDi v\xE0o s\u1ED1 \u0111i\u1EC7n tho\u1EA1i quen thu\u1ED9c c\u1EE7a ph\xF2ng kh\xE1m. Fonnus nghe m\xE1y 24/7 b\u1EB1ng ti\u1EBFng Vi\u1EC7t, b\xE1o gi\xE1, gi\u1EEF l\u1ECBch h\u1EB9n \u2014 v\xE0 chuy\u1EC3n ngay cho b\xE1c s\u0129 khi c\xE2u h\u1ECFi thu\u1ED9c v\u1EC1 chuy\xEAn m\xF4n."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-3)",
      marginTop: "var(--space-8)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    onClick: onDemo,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "phone-call",
      size: 18
    })
  }, "Nghe th\u1EED Fonnus"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "secondary"
  }, "Xem b\xE1o gi\xE1")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-6)",
      marginTop: "var(--space-8)",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Cu\u1ED9c g\u1ECDi \u0111\xE3 nghe",
    value: "1.847",
    size: "sm"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "L\u1ECBch h\u1EB9n gi\u1EEF \u0111\u01B0\u1EE3c",
    value: "312",
    size: "sm"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Doanh thu gi\u1EEF l\u1EA1i",
    value: "86.500.000",
    unit: "\u0111",
    size: "sm"
  }))), /*#__PURE__*/React.createElement(Card, {
    tone: "warm",
    radius: "var(--radius-2xl)",
    padding: "var(--space-8)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      marginBottom: "var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    variant: "mark",
    height: 28,
    assetBase: "../../assets"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: "var(--size-body-lg)"
    }
  }, "Cu\u1ED9c g\u1ECDi l\xFAc 21:42"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--size-ui)",
      color: "var(--text-muted)"
    }
  }, "Nha khoa Minh Anh \xB7 ngo\xE0i gi\u1EDD l\xE0m vi\u1EC7c")), /*#__PURE__*/React.createElement(Badge, {
    tone: "success",
    dot: true,
    style: {
      marginLeft: "auto"
    }
  }, "\u0110\xE3 x\u1EED l\xFD")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement(SpeechBubble, {
    speaker: "caller"
  }, "\"Ph\xF2ng kh\xE1m c\xF2n nh\u1EADn c\u1EA1o v\xF4i r\u0103ng s\xE1ng th\u1EE9 B\u1EA3y kh\xF4ng em?\""), /*#__PURE__*/React.createElement(SpeechBubble, {
    speaker: "assistant"
  }, "\"D\u1EA1 c\xF2n \u1EA1. C\u1EA1o v\xF4i r\u0103ng l\xE0 ", /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, "300.000 \u0111"), ". Ch\u1ECB mu\u1ED1n em gi\u1EEF l\u1ECBch 9 gi\u1EDD s\xE1ng th\u1EE9 B\u1EA3y kh\xF4ng?\""), /*#__PURE__*/React.createElement(SpeechBubble, {
    speaker: "handoff"
  }, "\"Em \u0111\xE3 ghi l\u1ECBch 9:00 th\u1EE9 B\u1EA3y. S\xE1ng mai l\u1EC5 t\xE2n s\u1EBD g\u1ECDi x\xE1c nh\u1EADn l\u1EA1i \u1EA1.\""))));
}
function Steps() {
  const steps = [{
    icon: "phone-incoming",
    t: "Điện thoại reo",
    d: "Fonnus nghe máy từ tiếng reo thứ hai, kể cả 22 giờ đêm và ngày Tết."
  }, {
    icon: "message-circle",
    t: "Nói bằng tiếng Việt",
    d: "Tự giới thiệu là trợ lý AI, trả lời giá và giờ làm việc theo đúng dữ liệu của phòng khám."
  }, {
    icon: "calendar-check",
    t: "Giữ cái hẹn",
    d: "Ghi lịch vào bảng của phòng khám và nhắc khách trước giờ hẹn qua Zalo."
  }, {
    icon: "user-round",
    t: "Chuyển cho bác sĩ",
    d: "Câu hỏi thuộc chuyên môn được nối máy hoặc chuyển lại kèm nội dung đã ghi."
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--milk)",
      padding: "var(--space-20) 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: "var(--size-display)",
      lineHeight: "var(--leading-display)",
      maxWidth: "22ch"
    }
  }, "B\u1ED1n vi\u1EC7c Fonnus l\xE0m trong m\u1ED9t cu\u1ED9c g\u1ECDi"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: "var(--gap-card)",
      marginTop: "var(--space-12)"
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement(Card, {
    key: s.t,
    tone: i === 0 ? "terracotta" : "paper"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: s.icon,
    size: 22,
    color: i === 0 ? "var(--cream)" : "var(--terracotta-deep)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: "var(--size-body-lg)",
      marginTop: "var(--space-4)"
    }
  }, s.t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--size-body-sm)",
      lineHeight: 1.6,
      marginTop: "var(--space-2)",
      marginBottom: 0,
      color: i === 0 ? "rgba(255,246,232,.86)" : "var(--text-muted)"
    }
  }, s.d))))));
}
function Scripts() {
  const [tab, setTab] = React.useState("greeting");
  const scripts = {
    greeting: [["assistant", '"Phòng khám Nha khoa Minh Anh xin nghe. Em là Fonnus, trợ lý AI của phòng khám. Anh chị cần đặt lịch hay hỏi thông tin ạ?"']],
    price: [["caller", '"Trồng răng implant ở đây bao nhiêu em?"'], ["assistant", '"Implant tại phòng khám từ 18.000.000 đ một trụ, gồm cả phẫu thuật và mão răng. Anh muốn em giữ lịch khám tư vấn miễn phí không ạ?"']],
    handoff: [["caller", '"Răng anh đau ba ngày rồi, có phải viêm tuỷ không?"'], ["handoff", '"Câu này em xin phép chuyển cho bác sĩ trả lời trực tiếp. Em nối máy ngay ạ."']]
  };
  return /*#__PURE__*/React.createElement("section", {
    className: "wrap",
    style: {
      padding: "var(--space-20) 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: ".8fr 1.2fr",
      gap: "var(--space-16)",
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: "var(--size-display)",
      lineHeight: "var(--leading-display)"
    }
  }, "Nghe \u0111\xFAng nh\u1EEFng g\xEC kh\xE1ch s\u1EBD nghe"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-muted)",
      marginTop: "var(--space-4)"
    }
  }, "Ba m\u1EABu c\xE2u chu\u1EA9n: ch\xE0o m\xE1y c\xF3 c\xF4ng b\u1ED1 AI, tr\u1EA3 l\u1EDDi gi\xE1 k\xE8m h\xE0nh \u0111\u1ED9ng, chuy\u1EC3n tuy\u1EBFn y t\u1EBF."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-2)",
      flexWrap: "wrap",
      marginTop: "var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement(Tag, {
    selected: true
  }, "Ti\u1EBFng Vi\u1EC7t tr\u01B0\u1EDBc"), /*#__PURE__*/React.createElement(Tag, null, "C\xE2u ng\u1EAFn"), /*#__PURE__*/React.createElement(Tag, null, "Lu\xF4n c\xF4ng b\u1ED1 AI"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    items: [{
      value: "greeting",
      label: "Chào máy"
    }, {
      value: "price",
      label: "Hỏi giá"
    }, {
      value: "handoff",
      label: "Chuyển bác sĩ"
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
      marginTop: "var(--space-6)"
    }
  }, scripts[tab].map((l, i) => /*#__PURE__*/React.createElement(SpeechBubble, {
    key: i,
    speaker: l[0]
  }, l[1]))))));
}
function Pricing() {
  const [annual, setAnnual] = React.useState(true);
  const plans = [{
    name: "Một cơ sở",
    price: annual ? "1.250.000" : "1.490.000",
    note: "mỗi tháng · 1 số điện thoại",
    feat: ["Nghe máy 24/7", "Giữ lịch hẹn qua Zalo", "Báo cáo cuộc gọi hàng tuần"],
    tone: "milk",
    cta: "secondary"
  }, {
    name: "Phòng khám",
    price: annual ? "2.900.000" : "3.400.000",
    note: "mỗi tháng · tới 2 cơ sở",
    feat: ["Mọi thứ của gói một cơ sở", "Chuyển tuyến cho bác sĩ", "Bảng giá dịch vụ riêng", "Nhắc khách trước giờ hẹn"],
    tone: "terracotta",
    cta: "inverse",
    badge: "Phổ biến"
  }, {
    name: "Chuỗi",
    price: "Liên hệ",
    note: "3 cơ sở trở lên",
    feat: ["Nhiều số điện thoại", "Phân quyền theo cơ sở", "Xuất hoá đơn & báo cáo"],
    tone: "milk",
    cta: "secondary"
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-warm)",
      padding: "var(--space-20) 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: "var(--space-8)"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: "var(--size-display)",
      lineHeight: "var(--leading-display)"
    }
  }, "Gi\xE1 r\xF5 r\xE0ng, kh\xF4ng h\u1ECFi l\u1EA1i"), /*#__PURE__*/React.createElement(Switch, {
    label: "Tr\u1EA3 tr\u01B0\u1EDBc 12 th\xE1ng",
    hint: "Ti\u1EBFt ki\u1EC7m ~16%",
    checked: annual,
    onChange: () => setAnnual(!annual),
    style: {
      width: 260
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: "var(--gap-card)",
      marginTop: "var(--space-10)",
      alignItems: "start"
    }
  }, plans.map(p => /*#__PURE__*/React.createElement(Card, {
    key: p.name,
    tone: p.tone,
    padding: "var(--space-8)",
    radius: "var(--radius-xl)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: "var(--size-subheading)"
    }
  }, p.name), p.badge ? /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral",
    style: {
      background: "rgba(255,246,232,.18)",
      color: "var(--cream)"
    }
  }, p.badge) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 6,
      marginTop: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      fontSize: 34,
      fontWeight: 600
    }
  }, p.price), p.price !== "Liên hệ" ? /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      fontSize: "var(--size-body-sm)",
      opacity: .7
    }
  }, "\u0111") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--size-ui)",
      opacity: .75,
      marginTop: 4
    }
  }, p.note), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      padding: 0,
      margin: "var(--space-6) 0 0",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)"
    }
  }, p.feat.map(x => /*#__PURE__*/React.createElement("li", {
    key: x,
    style: {
      display: "flex",
      gap: 8,
      fontSize: "var(--size-body-sm)",
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: .7
    }
  }, "\u2713"), x))), /*#__PURE__*/React.createElement(Button, {
    variant: p.cta,
    fullWidth: true,
    style: {
      marginTop: "var(--space-8)"
    }
  }, p.price === "Liên hệ" ? "Nói chuyện với chúng tôi" : "Bắt đầu"))))));
}
function Numbers() {
  const rows = [["01", "Tỷ lệ cuộc gọi được đón", "Mẫu số là mọi lần điện thoại reo — kể cả 10 giờ đêm và ngày Tết.", "98,6%"], ["02", "Số giờ chủ doanh nghiệp lấy lại", "Sản phẩm thật của Fonnus. Nếu con số này bằng không, chúng ta đã bán một món đồ chơi.", "41 giờ"], ["03", "Số cái hẹn giữ được", "Đặt lịch mà khách không đến thì chưa phải doanh thu.", "312"]];
  return /*#__PURE__*/React.createElement("section", {
    className: "wrap",
    style: {
      padding: "var(--space-20) 0"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: "var(--size-display)",
      lineHeight: "var(--leading-display)"
    }
  }, "Ba con s\u1ED1 ch\xFAng ta \u0111o"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
      marginTop: "var(--space-10)"
    }
  }, rows.map(r => /*#__PURE__*/React.createElement(Card, {
    key: r[0],
    tone: "milk",
    padding: "var(--space-6)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-6)",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      color: "var(--text-accent)",
      fontWeight: 600
    }
  }, r[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: "var(--size-subheading)"
    }
  }, r[1]), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--text-muted)",
      fontSize: "var(--size-body-sm)",
      marginTop: 4,
      maxWidth: "64ch"
    }
  }, r[2])), /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      fontSize: 28,
      fontWeight: 600
    }
  }, r[3]))))));
}
function Footer() {
  const cols = [["Sản phẩm", ["Cách hoạt động", "Giá", "Bảo mật dữ liệu"]], ["Ngành", ["Nha khoa", "Thẩm mỹ", "Y tế mở rộng"]], ["Công ty", ["Về Fonnus", "Tuyển dụng", "Liên hệ"]]];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: "var(--surface-inverse)",
      color: "var(--text-on-inverse)",
      padding: "var(--space-16) 0 var(--space-10)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap",
    style: {
      display: "grid",
      gridTemplateColumns: "1.4fr repeat(3,1fr)",
      gap: "var(--space-10)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Logo, {
    variant: "mark-dark",
    height: 36,
    assetBase: "../../assets"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: "var(--size-subheading)",
      marginTop: "var(--space-4)"
    }
  }, "Kh\xF4ng cu\u1ED9c g\u1ECDi n\xE0o b\u1ECB b\u1ECF l\u1EE1."), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--text-muted-on-inverse)",
      fontSize: "var(--size-body-sm)",
      marginTop: "var(--space-2)"
    }
  }, "Fonnus t\u1EF1 gi\u1EDBi thi\u1EC7u l\xE0 tr\u1EE3 l\xFD AI ngay \u0111\u1EA7u m\u1ED7i cu\u1ED9c g\u1ECDi.")), cols.map(c => /*#__PURE__*/React.createElement("div", {
    key: c[0]
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      color: "var(--terracotta-night)"
    }
  }, c[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)",
      marginTop: "var(--space-4)"
    }
  }, c[1].map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      color: "var(--text-muted-on-inverse)",
      fontSize: "var(--size-body-sm)"
    }
  }, l)))))), /*#__PURE__*/React.createElement("div", {
    className: "wrap",
    style: {
      marginTop: "var(--space-12)",
      paddingTop: "var(--space-5)",
      borderTop: "1px solid var(--border-on-inverse)",
      display: "flex",
      justifyContent: "space-between",
      fontSize: "var(--size-ui)",
      color: "var(--text-muted-on-inverse)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Fonnus"), /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, "090 123 45 67 \xB7 xinchao@fonnus.ai")));
}
Object.assign(window, {
  Header,
  Hero,
  Steps,
  Scripts,
  Pricing,
  Numbers,
  Footer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/LandingSections.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.SpeechBubble = __ds_scope.SpeechBubble;

__ds_ns.Stat = __ds_scope.Stat;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
