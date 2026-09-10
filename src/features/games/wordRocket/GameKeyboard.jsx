import { CornerDownLeft, Delete } from 'lucide-react';
import { KEYBOARD_ROWS } from './gameConfig';

function KeyButton({ children, onClick, wide = false, disabled = false, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`${wide ? 'min-w-14 flex-1' : 'min-w-0 flex-1'} flex h-9 touch-manipulation items-center justify-center rounded-lg border border-white/10 bg-slate-700/90 px-0.5 text-xs font-bold text-white shadow-[0_2px_0_rgba(15,23,42,0.9)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-40 min-[390px]:h-10 min-[390px]:text-sm sm:h-11 sm:rounded-xl sm:text-base`}
    >
      {children}
    </button>
  );
}

export default function GameKeyboard({ onCharacter, onBackspace, onSubmit, disabled, locale, alwaysVisible = false }) {
  return (
    <div className={`${alwaysVisible ? '' : 'lg:hidden'} space-y-1.5 rounded-xl border border-white/10 bg-[#100b28]/95 p-1.5 shadow-inner min-[390px]:p-2 sm:rounded-2xl sm:p-2.5`}>
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={row.join('')} className={`mx-auto flex gap-1 ${rowIndex === 1 ? 'px-2' : rowIndex === 2 ? 'px-4' : ''} min-[390px]:gap-1.5`}>
          {row.map((letter) => (
            <KeyButton key={letter} onClick={() => onCharacter(letter)} disabled={disabled} label={letter}>
              {letter}
            </KeyButton>
          ))}
        </div>
      ))}
      <div className="flex gap-1.5 min-[390px]:gap-2">
        <KeyButton wide onClick={() => onCharacter(' ')} disabled={disabled} label={locale === 'vi' ? 'Dấu cách' : 'Space'}>
          {locale === 'vi' ? 'DẤU CÁCH' : 'SPACE'}
        </KeyButton>
        <KeyButton onClick={onBackspace} disabled={disabled} label={locale === 'vi' ? 'Xóa ký tự' : 'Backspace'}>
          <Delete size={19} />
        </KeyButton>
        <KeyButton wide onClick={onSubmit} disabled={disabled} label={locale === 'vi' ? 'Trả lời' : 'Submit'}>
          <CornerDownLeft size={19} />
        </KeyButton>
      </div>
    </div>
  );
}
