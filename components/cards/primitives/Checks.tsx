export function Checks({ passed, total }: { passed: number; total: number }) {
  const ok = total > 0 && passed === total;
  return <span data-k="Checks" className={`pc-checks ${ok ? 'pc-checks-ok' : total === 0 ? 'pc-checks-none' : 'pc-checks-bad'}`}>checks {passed}/{total}</span>;
}
