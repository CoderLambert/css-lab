/** Runtime-owned source injected into the sandbox bridge; no learner JS is evaluated. */
export function createRuleStyleCheckScript(): string {
  return String.raw`
  const normalizeMedia = (value) => value.trim().replace(/\s+/g, " ");

  const runRuleStyleCheck = (check) => {
    const accepted = [check.equals, ...(check.alsoAccepts ?? [])];
    const expected = accepted.join(" / ") +
      (check.priority === undefined ? "" : " [priority: " + check.priority + "]") +
      (check.afterSelector === undefined ? "" : " [after: " + check.afterSelector + "]");

    try {
      // Validate syntax, not DOM presence: pseudo-state rules need not be active.
      learnerRoot.querySelector(check.selector);
      if (check.afterSelector !== undefined) {
        learnerRoot.querySelector(check.afterSelector);
      }

      // These references were captured before mounting learner HTML. Never discover
      // source sheets through document.styleSheets or learner-controlled attributes.
      const slot = cssSlots.get(check.path);
      if (!slot || !slot.sheet) {
        return result(check, false, "target-not-found", expected, null, check.property);
      }

      let selectorFound = false;
      let declaration = null;
      let sequence = 0;
      let referencePosition = null;
      const matchingMedia = check.media === undefined ? null : normalizeMedia(check.media);

      const inspectRules = (rules, insideMatchingMedia) => {
        for (const rule of rules) {
          if (rule instanceof CSSStyleRule) {
            if (!insideMatchingMedia && check.media !== undefined) continue;
            sequence += 1;
            if (check.afterSelector !== undefined && rule.selectorText === check.afterSelector) {
              referencePosition = sequence;
            }
            if (rule.selectorText !== check.selector) continue;
            selectorFound = true;
            const value = rule.style.getPropertyValue(check.property).trim();
            if (value) {
              // Deliberately inspect the last authored declaration, not the cascade.
              declaration = {
                value,
                priority: rule.style.getPropertyPriority(check.property) === "important"
                  ? "important" : "normal",
                position: sequence,
              };
            }
            continue;
          }
          // v1 inspects top-level rules or a matching top-level media block only.
          // Do not silently flatten nested conditions, layers, or CSS nesting.
          if (!insideMatchingMedia && check.media !== undefined &&
              rule instanceof CSSMediaRule &&
              normalizeMedia(rule.conditionText) === matchingMedia) {
            inspectRules(rule.cssRules, true);
          }
        }
      };
      inspectRules(slot.sheet.cssRules, false);

      if (!selectorFound) {
        return result(check, false, "target-not-found", expected, null, check.property);
      }
      if (!declaration) {
        return result(check, false, "mismatch", expected, null, check.property);
      }
      const orderMatches = check.afterSelector === undefined ||
        (referencePosition !== null && declaration.position > referencePosition);
      const priorityMatches = check.priority === undefined || check.priority === declaration.priority;
      const passed = accepted.includes(declaration.value) && priorityMatches && orderMatches;
      const actual = declaration.value +
        (check.priority === undefined ? "" : " [priority: " + declaration.priority + "]") +
        (check.afterSelector === undefined ? "" : " [after: " + orderMatches + "]");
      return result(check, passed, passed ? "matched" : "mismatch", expected, actual, check.property);
    } catch {
      return result(check, false, "checker-error", expected, null, check.property);
    }
  };
`;
}
