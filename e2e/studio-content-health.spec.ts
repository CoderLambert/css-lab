import { expect, test } from "@playwright/test";

test("studio audits the full content tree and exposes published learner entries", async ({
  page,
}) => {
  await page.goto("/studio");

  await expect(
    page.getByRole("heading", { level: 1, name: "CSS Lab Studio" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Content Health" }),
  ).toBeVisible();
  await expect(page.getByText("0 blocking issues")).toBeVisible();
  await expect(page.getByText("0 warnings")).toBeVisible();

  await expect(
    page.getByRole("heading", { level: 2, name: "Content Catalog" }),
  ).toBeVisible();
  await expect(page.getByText("3", { exact: true })).toBeVisible();

  const learnerLinks = page.getByRole("link", { name: "打开 learner" });
  await expect(learnerLinks).toHaveCount(3);
  await expect(learnerLinks.first()).toHaveAttribute(
    "href",
    "/learn/css-foundations/flexbox/flexbox-alignment/center-box",
  );
});
