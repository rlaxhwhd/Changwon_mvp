interface Props {
  kicker: string;
  title: string;
  sub?: string;
}

export default function PageHeader({ kicker, title, sub }: Props) {
  return (
    <div className="page-head">
      <div className="page-kicker">{kicker}</div>
      <h1 className="page-title">{title}</h1>
      {sub && <p className="page-sub">{sub}</p>}
    </div>
  );
}
