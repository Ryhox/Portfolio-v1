// A project's name on a Liquid Glass label over its clip, the same glass as the tech stack's capsules: the clip
// frosted behind it, a thin sheen only where the rim faces the light (no line all the way round). All CSS
// (.panel-label in globals.css), sized in em, so it follows the text at every screen size and costs nothing
// to scroll.
export default function GlassLabel({ children }: { children: string }) {
  return (
    <span className="panel-label" aria-hidden>
      <span className="panel-label-text">{children}</span>
    </span>
  );
}
