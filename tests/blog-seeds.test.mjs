import assert from "node:assert/strict";
import test from "node:test";
import { STARTER_BLOGS } from "../src/lib/blog-seeds.ts";
import { blogInputSchema } from "../src/lib/portal.ts";

test("starter education blogs are valid, published, and unique", () => {
  assert.equal(STARTER_BLOGS.length, 5);

  const ids = new Set();
  for (const post of STARTER_BLOGS) {
    const { id, ...input } = post;
    assert.equal(blogInputSchema.safeParse(input).success, true);
    assert.equal(post.status, "published");
    assert.equal(ids.has(id), false);
    ids.add(id);
    assert.ok(post.content.length >= 300);
  }
});

test("starter education blogs cover nutrition, habits, and growth", () => {
  const categories = new Set(STARTER_BLOGS.map((post) => post.category));
  assert.ok(categories.has("nutrition"));
  assert.ok(categories.has("healthy_habits"));
  assert.ok(categories.has("growth"));
});
