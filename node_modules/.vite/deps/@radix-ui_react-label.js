"use client";
import {
  Primitive
} from "./chunk-PBNCKGTQ.js";
import "./chunk-R6S4VRB5.js";
import "./chunk-6LRRM7M2.js";
import {
  require_jsx_runtime
} from "./chunk-S77I6LSE.js";
import {
  require_react
} from "./chunk-3TFVT2CW.js";
import {
  __toESM
} from "./chunk-4MBMRILA.js";

// node_modules/@radix-ui/react-label/dist/index.mjs
var React = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var NAME = "Label";
var Label = React.forwardRef((props, forwardedRef) => {
  return (0, import_jsx_runtime.jsx)(
    Primitive.label,
    {
      ...props,
      ref: forwardedRef,
      onMouseDown: (event) => {
        var _a;
        const target = event.target;
        if (target.closest("button, input, select, textarea")) return;
        (_a = props.onMouseDown) == null ? void 0 : _a.call(props, event);
        if (!event.defaultPrevented && event.detail > 1) event.preventDefault();
      }
    }
  );
});
Label.displayName = NAME;
var Root = Label;
export {
  Label,
  Root
};
//# sourceMappingURL=@radix-ui_react-label.js.map
