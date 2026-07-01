import {MaybeHiddenDiv} from '@/app/(authenticated)/overview/hide-balances';
import {PlayIcon} from '@heroicons/react/16/solid';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {cn} from '@/lib/utils';

function TrendTriangle({up}: {up: boolean}) {
  return (
    <PlayIcon
      className={cn('size-[0.75em] shrink-0', up ? '-rotate-90' : 'rotate-90')}
    />
  );
}

// Renders a signed change like "▲ +$1,200 · 30d · +3.40%", coloured green when
// the delta rises and red when it falls, or a muted "— flat · 30d" when it is
// zero. When `base` is given the percentage of change relative to it is
// appended.
export function SignedDelta({
  delta,
  label,
  base,
  className,
}: {
  delta: AmountWithCurrency;
  label: string;
  base?: AmountWithCurrency;
  className?: string;
}) {
  if (delta.isZero()) {
    return (
      <span className={cn('text-muted-foreground', className)}>
        — flat · {label}
      </span>
    );
  }
  const color = delta.isPositive() ? 'text-up-amount' : 'text-down-amount';
  const sign = delta.isPositive() ? '+' : '-';
  const percent =
    base && !base.isZero()
      ? (delta.abs().dollar() / base.abs().dollar()) * 100
      : null;
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <MaybeHiddenDiv className={cn('inline-flex items-center gap-1', color)}>
        <TrendTriangle up={delta.isPositive()} />
        <span>
          {sign}
          {delta.abs().round().format()}
        </span>
      </MaybeHiddenDiv>
      <span className="text-muted-foreground font-medium">·</span>
      <span className="text-muted-foreground font-medium">{label}</span>
      {percent !== null && (
        <>
          <span className="text-muted-foreground font-medium">·</span>
          <MaybeHiddenDiv className={cn('inline-block', color)}>
            {sign}
            {percent.toFixed(2)}%
          </MaybeHiddenDiv>
        </>
      )}
    </span>
  );
}
