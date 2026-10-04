/** Runtime-owned intrinsic-size evidence for one static horizontal HTML box. */
export function createLayoutMaxContentCheckScript(): string {
  return String.raw`
  const runLayoutMaxContentCheck = (check) => {
    const tolerance = 0.5;
    const requirement = check.selector +
      " 的实际 border-box inline size 应与同元素 max-content 参考尺寸一致（容差 0.5 CSS px）";
    const fail = (reason, detail) =>
      result(check, false, reason, requirement, detail);

    try {
      const targets = [...learnerRoot.querySelectorAll(check.selector)]
        .filter((element) => element !== learnerRoot);
      if (targets.length === 0) {
        return fail("target-not-found", "未找到目标元素");
      }
      if (targets.length !== 1) {
        return fail("checker-error", "目标选择器必须唯一");
      }

      const target = targets[0];
      if (!(target instanceof HTMLElement)) {
        return fail("checker-error", "首版仅支持普通 HTML 元素");
      }

      const targetRects = target.getClientRects();
      if (targetRects.length === 0) {
        return fail("mismatch", "目标没有渲染盒");
      }
      if (targetRects.length !== 1) {
        return fail("checker-error", "首版不支持多片段布局盒");
      }
      const actualRect = target.getBoundingClientRect();
      if (![actualRect.left, actualRect.right, actualRect.width, actualRect.height]
          .every(Number.isFinite)) {
        return fail("checker-error", "实际布局测量不是有限数值");
      }
      if (actualRect.width <= 0 || actualRect.height <= 0) {
        return fail("mismatch", "目标必须具有正的实际宽高");
      }

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
            style.position === "fixed" || style.position === "sticky") {
          return fail("checker-error", "首版不支持滚动或 fixed/sticky 场景");
        }
        if ((style.columnCount !== "auto" && style.columnCount !== "1") ||
            style.columnWidth !== "auto" || style.display.includes("table") ||
            style.contentVisibility === "auto" ||
            !["", "none"].includes(style.contain)) {
          return fail("checker-error", "首版不支持分栏、表格、contain 或跳过渲染的布局");
        }
        if (node.getAnimations().length > 0) {
          return fail("checker-error", "首版仅支持静态布局，不能在动画或过渡中认证");
        }
      }
      if (learnerRoot.getAnimations({ subtree: true }).length > 0) {
        return fail("checker-error", "学习片段仍有动画或过渡，无法认证静态布局");
      }

      const targetStyle = getComputedStyle(target);
      const parent = target.parentElement;
      if (!(parent instanceof HTMLElement)) {
        return fail("checker-error", "目标必须位于普通 HTML 父元素中");
      }
      const parentStyle = getComputedStyle(parent);
      if (targetStyle.float !== "none" ||
          !["static", "relative"].includes(targetStyle.position) ||
          parentStyle.display.includes("flex") ||
          parentStyle.display.includes("grid") ||
          parentStyle.display.includes("table") ||
          (parentStyle.columnCount !== "auto" && parentStyle.columnCount !== "1") ||
          parentStyle.columnWidth !== "auto" ||
          targetStyle.aspectRatio !== "auto") {
        return fail("checker-error", "首版仅支持普通 block-flow intrinsic inline-size 场景");
      }

      const originalStyle = target.getAttribute("style");
      let referenceRect = null;
      try {
        target.style.setProperty("transition", "none", "important");
        target.style.setProperty("animation", "none", "important");
        target.style.setProperty("width", "max-content", "important");
        target.style.setProperty("inline-size", "max-content", "important");
        target.style.setProperty("min-width", "0px", "important");
        target.style.setProperty("min-inline-size", "0px", "important");
        target.style.setProperty("max-width", "none", "important");
        target.style.setProperty("max-inline-size", "none", "important");
        const referenceRects = target.getClientRects();
        if (referenceRects.length !== 1) {
          return fail(
            referenceRects.length === 0 ? "mismatch" : "checker-error",
            referenceRects.length === 0
              ? "max-content 参考测量没有渲染盒"
              : "max-content 参考测量出现多片段布局盒",
          );
        }
        referenceRect = target.getBoundingClientRect();
        if (![referenceRect.width, referenceRect.height].every(Number.isFinite) ||
            referenceRect.width <= 0 || referenceRect.height <= 0) {
          return fail("checker-error", "max-content 参考测量不是有效正尺寸");
        }
      } finally {
        if (originalStyle === null) {
          target.removeAttribute("style");
        } else {
          target.setAttribute("style", originalStyle);
        }
      }

      if (!referenceRect) {
        return fail("checker-error", "未获得 max-content 参考测量");
      }
      const delta = Math.abs(actualRect.width - referenceRect.width);
      const passed = delta <= tolerance;
      const expected = "max-content reference border width=" +
        referenceRect.width.toFixed(2) + "px，容差 0.5 CSS px";
      const actual = "actual border width=" + actualRect.width.toFixed(2) +
        "px，delta=" + delta.toFixed(2) + "px";
      return result(
        check,
        passed,
        passed ? "matched" : "mismatch",
        expected,
        actual,
      );
    } catch {
      return fail("checker-error", "选择器无效或 intrinsic-size 测量失败");
    }
  };
`;
}
