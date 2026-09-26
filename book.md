# Book reviews (books.html)

Use `shortnessoflife` (On the Shortness of Life, Philosophy section) as the
reference implementation for everything below.

## Content rules (most important)

- The user's review, essays, and quotes go in **verbatim**. Don't reword,
  "improve," or add claims, reactions, or transitions in their voice.
- Readability work is structural: splitting paragraphs, moving quotes,
  emphasis, and layout. The words stay the same.
- If a readability move needs new words (a verdict, a lead-in line, a label
  not taken from their text), write it from their own phrases, keep it in
  first person, and **flag it** so they can approve or change it.
- Tone is reflective, not debate-style. Don't make it argue against anyone.
- Keep quotes in the exact order given.

## Wiring checklist

1. **Cover:** save to `images/Books/<slug>.jpg`, resized to about 644×1000.
2. **Accent color:** pick one from the cover. It's used for the score slider,
   quote borders, verdict border, essay labels, and pull quotes.
3. **Entry:** add `<!--Title-->`, then `<button class="collapsible">Title by
   Author</button>`, then `<div class="collapsiblecontent" id="<slug>">`.
   Inside it:
   - a rating row (`My Rating: N/10` plus an italic `Read in Mon YYYY`)
   - `<div id="<slug>-scores">` filled by
     `createScoreSlider(scores, overall, color, -25)`
   - the verdict box
   - the cover and review in a `w3-row`: cover in a `w3-col w3-half` with a
     `.w3-image`, intro text in the other `w3-half`. Later paragraphs follow
     as siblings and wrap around the floated cover. On mobile the cover
     stacks above the text.
   - a Quotes `<h3>` followed by blockquotes with
     `style="border-left-color: <accent>"`. Optional commentary goes in a
     `<p class="quote-note">`.
   - essays in `<div id="<slug>-essay1">`, `-essay2`, and so on, each with
     an `<h3>` title
4. **Section banner:** add the cover to the section's banner row and
   rebalance the column widths.
5. **Table of contents:** add `<a href="#<slug>">Title</a>` to the section's
   line, separated by ` • `.
6. **Latest-review popup:** update the popup `<p>` title,
   `const currentBook = '<slug>'`, and `getElementById('<slug>')` in the
   popupYes handler.
7. **Fav Quotes:** if any new lines go in the "Good Lines / Fav Quotes"
   section, link the book title back with `<a class="quote-source"
   href="#<slug>">`.

## Readability toolkit: apply automatically to every new review

Readers start at the review. If the review doesn't pull them in, they never
reach the essays, so it gets the most care. Mobile matters most, and the
failure to avoid is "the words never stop."

### Verdict box (top of every review)

Put it right under the score sliders, before the cover:

```html
<div class="verdict" style="border-left-color: <accent>">
    <p class="verdict-title" style="color: <accent>">The Verdict</p>
    <p>One or two sentences.</p>
</div>
```

- Write it as prose that captures their overall sentiment. Never use a
  Good/Bad or pros/cons binary.
- Don't pull out one narrow complaint. It should match the review's overall
  feeling. Example: "Reading it made me want to get up and go do something,
  even though I don't agree with a lot of what he says. For me, the value
  came from disagreeing with him."
- Build it from their own phrases, in first person throughout. Don't mix the
  general "you" with "I" in the same sentence, and keep tenses consistent.
- It's new wording, so flag it for approval.

### Lede

Add `class="lede"` to the review's first `<p>`. That sets it slightly larger,
so the review has a clear starting point.

### Paragraph breaks

- Split long paragraphs where the thought already turns: "But…", "Still…",
  "And yet…", or setup to pushback.
- Let pivot lines and punchy closers stand alone as one-line paragraphs, for
  example "But really, I don't like a lot of his takes." and "My guy really
  loses the plot."
- Aim for no more than about 3–4 sentences per paragraph on mobile.

### Inline toggle for long examples

A long illustrative example in the review (like the Augustus passage) goes
behind the claim it supports, so skimmers skip straight on:

```html
<span class="inline-expand" role="button" tabindex="0" aria-expanded="false"
      aria-controls="<slug>-<name>">The claim sentence.</span>
...
<div class="inline-expand-content" id="<slug>-<name>"> ...example paragraphs... </div>
```

The shared script handles toggling and resizes the open review so nothing
gets clipped. Prefer this to cutting the example.

### Pull quotes

Use them as pauses between paragraphs, the way articles do:

```html
<figure class="pull-quote">
    <blockquote>“Verbatim quote”</blockquote>
    <figcaption>optional note (e.g. an existing quote-note)</figcaption>
</figure>
```

- **Source:** the book's quotes the user supplied, verbatim, in curly quotes
  with no trailing period.
  - Move them out of the Quotes section; don't duplicate them. Anything you
    don't place stays in the Quotes section in its original order, and any
    quote you prune goes back there.
- **Placement:** put each one right after the paragraph it matches in
  meaning (e.g. the "tight fisted with wealth, generous with time" quote
  after the paragraph about being frugal with things but not with time).
- **Density:**
  - at most 2 per essay (or per half of an essay)
  - never back to back, with at least one paragraph between them
  - usually 1 in the review
- **Don't** pull-quote the user's own sentence as a preview of a line that
  appears later (it read as nonsense).
- **Do** watch for the book's author being quoted mid-sentence in the
  user's own text (a "hidden" pull quote). Lift that quote out into its own
  pull quote, and adjust only the words around it so the paragraph still
  reads naturally. For example, in the Seneca essay this sentence:

  > The philosopher alone, he says, is unfettered by the confines of
  > humanity and lives forever, like a god, which is an extremely
  > self-important thing to say.

  became a pull quote of Seneca's words, followed by a paragraph that
  starts "That's an extremely self-important thing to say."
  - Confirm with the user that the lifted words are a word-for-word quote
    before adding quote marks.
- Styling (smaller on mobile) is already in the page CSS.

### Essay section labels

Break a long essay into halves with small labels. Take the wording from the
essay's own title where possible (e.g. "Good Question, Questionable Answer"
gives THE GOOD QUESTION and THE QUESTIONABLE ANSWER):

```html
<h4 class="essay-part" style="color: <accent>">The Good Question</h4>
```

Short essays (about 3 paragraphs) don't need labels.

### Emphasis: use sparingly

- **Bold:** at most about 3 lines in the review, and only the main points a
  skimmer should take away. Don't bold anything in the essays; the user
  removed all essay bolding.
- **Italics:** not for tone or asides (the user rejected that). The one good
  use is in a long argument paragraph: italicize the author's claim and bold
  the user's conclusion, so a skimmer sees both ends.
- **Underline:** never. Underlines on this page read as links.
- Don't bold a line in the review that the verdict box already says.

### Checking on mobile

Headless Chrome screenshots of the full page come out as a purple
background. To preview, inject a script into a temporary copy of
`books.html` (delete it afterward) that:
- clones the `#<slug>` element into a fresh body,
- pins the clone at `position:absolute; top:0; width:390px`, and
- sets `max-height: none` on it.

Then screenshot at 390px wide. Use a negative `top` offset to page down.
