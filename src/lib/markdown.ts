import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

/**
 * Notes are untrusted input. Markdown is rendered with raw HTML disabled at the
 * parser level and then sanitized with a strict allow-list.
 */
const renderer = new marked.Renderer();
renderer.html = () => ""; // drop any raw HTML blocks/inline HTML entirely
renderer.link = ({ href, title, tokens }) => {
  const text = marked.Parser.parseInline(tokens);
  const safe = /^(https?:|mailto:)/i.test(href ?? "") ? href : "#";
  return `<a href="${safe}"${title ? ` title="${title}"` : ""} target="_blank" rel="noopener noreferrer nofollow">${text}</a>`;
};
renderer.image = ({ text }) => `<span>[image: ${text}]</span>`;

export function renderMarkdown(source: string): string {
  const html = marked.parse(source, { renderer, gfm: true, breaks: true, async: false }) as string;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "del", "code", "pre", "blockquote", "ul", "ol", "li", "h1", "h2", "h3", "h4", "hr", "a", "span", "input", "table", "thead", "tbody", "tr", "th", "td"],
    ALLOWED_ATTR: ["href", "title", "target", "rel", "type", "checked", "disabled"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#)/i,
  });
}

export function plainExcerpt(source: string, max = 140): string {
  return source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-[\]()!|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
