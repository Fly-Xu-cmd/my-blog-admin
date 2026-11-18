export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  )
    return items;
  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

export function sameOrder(a: { id: number }[], b: { id: number }[]) {
  return (
    a.length === b.length && a.every((item, index) => item.id === b[index].id)
  );
}
