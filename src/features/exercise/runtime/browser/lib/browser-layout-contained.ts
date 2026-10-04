/** Runtime-owned geometry check for a static, untransformed horizontal HTML box. */
export function createLayoutContainedCheckScript(): string {
  return String.raw`
  const runLayoutContainedCheck = (check) => {
    const tolerance = 0.5;
    const requirement = check.selector + " 的非零 border box 应位于 " +
      check.within + " 的 content box 水平范围内（容差 0.5 CSS px）";
    const fail = (reason, detail) => result(check, false, reason, requirement, detail);

    try {
      const targets = [...learnerRoot.querySelectorAll(check.selector)]
        .filter((element) => element !== learnerRoot);
      const containers = [...learnerRoot.querySelectorAll(check.within)]
        .filter((element) => element !== learnerRoot);
      if (targets.length === 0 || containers.length === 0) {
        return fail("target-not-found", "未找到目标或容器");
      }
      if (targets.length !== 1 || containers.length !== 1) {
        return fail("checker-error", "目标和容器选择器必须分别唯一");
      }
      const target = targets[0];
      const container = containers[0];
      if (!(target instanceof HTMLElement) || !(container instanceof HTMLElement)) {
        return fail("checker-error", "首版仅支持普通 HTML 元素");
      }
      if (target === container || !container.contains(target)) {
        return fail("mismatch", "容器必须是目标的严格祖先");
      }

      // getBoundingClientRect unions fragments and includes transforms. Reject
      // those scenes before subtracting untransformed CSS padding/border lengths.
      const targetRects = target.getClientRects();
      const containerRects = container.getClientRects();
      if (targetRects.length === 0 || containerRects.length === 0) {
        return fail("mismatch", "目标或容器没有渲染盒");
      }
      if (targetRects.length !== 1 || containerRects.length !== 1) {
        return fail("checker-error", "首版不支持多片段布局盒");
      }
      const targetRect = target.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      for (const rect of [targetRect, containerRect]) {
        if (![rect.left, rect.right, rect.top, rect.bottom, rect.width, rect.height]
          .every(Number.isFinite)) {
          return fail("checker-error", "布局测量不是有限数值");
        }
        if (rect.width <= 0 || rect.height <= 0) {
          return fail("mismatch", "目标和容器必须具有正的实际宽高");
        }
      }

      // Include ancestors outside learnerRoot: learner CSS may style body/html.
      // This does not make the runtime shell a selectable checker target.
      for (let node = target; node; node = node.parentElement) {
        if (!(node instanceof HTMLElement)) {
          return fail("checker-error", "首版不支持混合 SVG/HTML 祖先");
        }
        const style = getComputedStyle(node);
        if (node.hasAttribute("hidden") || style.display === "none" ||
            style.visibility !== "visible" || Number(style.opacity) === 0 ||
            style.contentVisibility === "hidden") {
          return fail("mismatch", "目标或祖先被显式隐藏");
        }
        if (style.writingMode !== "horizontal-tb" ||
            !["", "1", "normal"].includes(style.getPropertyValue("zoom")) ||
            ["transform", "translate", "rotate", "scale", "perspective", "offset-path"]
              .some((property) => !["", "none"].includes(style.getPropertyValue(property)))) {
          return fail("checker-error", "首版不支持变换、缩放或非水平书写模式");
        }
        if (node.scrollLeft !== 0 || node.scrollTop !== 0 ||
            style.overflowX !== "visible" || style.overflowY !== "visible" ||
            style.position === "fixed" || style.position === "sticky") {
          return fail("checker-error", "首版不支持滚动、裁剪或 fixed/sticky 场景");
        }
        if ((style.columnCount !== "auto" && style.columnCount !== "1") ||
            style.columnWidth !== "auto" || style.display.includes("table") ||
            style.contentVisibility === "auto") {
          return fail("checker-error", "首版不支持分栏、表格或跳过渲染的布局");
        }
        if (["filter", "clip-path", "mask-image"]
              .some((property) => !["", "none"].includes(style.getPropertyValue(property))) ||
            !["", "auto"].includes(style.getPropertyValue("clip"))) {
          return fail("checker-error", "首版不认证滤镜、遮罩或裁剪效果");
        }
        if (node.getAnimations().length > 0) {
          return fail("checker-error", "首版仅支持静态布局，不能在动画或过渡中认证");
        }
      }
      if (learnerRoot.getAnimations({ subtree: true }).length > 0) {
        return fail("checker-error", "学习片段仍有动画或过渡，无法认证静态布局");
      }

      const containerStyle = getComputedStyle(container);
      const lengths = ["border-left-width", "padding-left", "border-right-width", "padding-right"]
        .map((property) => {
          const value = containerStyle.getPropertyValue(property).trim();
          return value.endsWith("px") ? Number(value.slice(0, -2)) : NaN;
        });
      if (!lengths.every((value) => Number.isFinite(value) && value >= 0)) {
        return fail("checker-error", "无法解析容器的实际边框或内边距");
      }
      const [borderLeft, paddingLeft, borderRight, paddingRight] = lengths;
      const left = containerRect.left + borderLeft + paddingLeft;
      const right = containerRect.right - borderRight - paddingRight;
      if (right <= left) {
        return fail("mismatch", "容器内容区必须具有正的可用宽度");
      }
      const passed = targetRect.left >= left - tolerance && targetRect.right <= right + tolerance;
      const expected = check.within + " content x=[" + left.toFixed(2) + ", " +
        right.toFixed(2) + "]，容差 0.5 CSS px";
      const actual = check.selector + " border x=[" + targetRect.left.toFixed(2) + ", " +
        targetRect.right.toFixed(2) + "]，size=" + targetRect.width.toFixed(2) +
        " × " + targetRect.height.toFixed(2);
      return result(check, passed, passed ? "matched" : "mismatch", expected, actual);
    } catch {
      return fail("checker-error", "选择器无效或布局测量失败");
    }
  };
`;
}
