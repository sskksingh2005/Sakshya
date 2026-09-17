import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const REVEAL_PIN = '1234';

export function Calculator() {
  const navigate = useNavigate();
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [pinBuffer, setPinBuffer] = useState('');

  const inputDigit = useCallback((digit: string) => {
    setPinBuffer((prev) => {
      const newBuffer = (prev + digit).slice(-4);
      if (newBuffer === REVEAL_PIN) {
        setTimeout(() => navigate('/auth'), 100);
        return '';
      }
      return newBuffer;
    });

    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  }, [display, waitingForOperand, navigate]);

  const inputDecimal = useCallback(() => {
    setPinBuffer('');
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  }, [display, waitingForOperand]);

  const clear = useCallback(() => {
    setPinBuffer('');
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  }, []);

  const performOperation = useCallback((nextOperator: string) => {
    setPinBuffer('');
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
    } else if (operator) {
      const currentValue = prevValue || 0;
      let newValue: number;
      switch (operator) {
        case '+': newValue = currentValue + inputValue; break;
        case '-': newValue = currentValue - inputValue; break;
        case '×': newValue = currentValue * inputValue; break;
        case '÷': newValue = inputValue === 0 ? 0 : currentValue / inputValue; break;
        case '%': newValue = currentValue % inputValue; break;
        default: newValue = inputValue;
      }
      const rounded = Math.round(newValue * 100000) / 100000;
      setDisplay(String(rounded));
      setPrevValue(rounded);
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  }, [display, prevValue, operator]);

  const equals = useCallback(() => {
    setPinBuffer('');
    if (operator && prevValue !== null) {
      const inputValue = parseFloat(display);
      let newValue: number;
      switch (operator) {
        case '+': newValue = prevValue + inputValue; break;
        case '-': newValue = prevValue - inputValue; break;
        case '×': newValue = prevValue * inputValue; break;
        case '÷': newValue = inputValue === 0 ? 0 : prevValue / inputValue; break;
        case '%': newValue = prevValue % inputValue; break;
        default: newValue = inputValue;
      }
      const rounded = Math.round(newValue * 100000) / 100000;
      setDisplay(String(rounded));
      setPrevValue(null);
      setOperator(null);
      setWaitingForOperand(true);
    }
  }, [display, prevValue, operator]);

  const toggleSign = () => {
    setPinBuffer('');
    if (display !== '0') {
      setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display);
    }
  };

  const buttons = [
    { label: 'AC', action: clear, type: 'fn' },
    { label: '±', action: toggleSign, type: 'fn' },
    { label: '%', action: () => performOperation('%'), type: 'op' },
    { label: '÷', action: () => performOperation('÷'), type: 'op' },
    { label: '7', action: () => inputDigit('7'), type: 'num' },
    { label: '8', action: () => inputDigit('8'), type: 'num' },
    { label: '9', action: () => inputDigit('9'), type: 'num' },
    { label: '×', action: () => performOperation('×'), type: 'op' },
    { label: '4', action: () => inputDigit('4'), type: 'num' },
    { label: '5', action: () => inputDigit('5'), type: 'num' },
    { label: '6', action: () => inputDigit('6'), type: 'num' },
    { label: '-', action: () => performOperation('-'), type: 'op' },
    { label: '1', action: () => inputDigit('1'), type: 'num' },
    { label: '2', action: () => inputDigit('2'), type: 'num' },
    { label: '3', action: () => inputDigit('3'), type: 'num' },
    { label: '+', action: () => performOperation('+'), type: 'op' },
    { label: '0', action: () => inputDigit('0'), type: 'num' },
    { label: '.', action: inputDecimal, type: 'num' },
    { label: '=', action: equals, type: 'op' },
  ];

  const getButtonClass = (type: string, label: string) => {
    if (label === '0') {
      return 'col-span-2 rounded-2xl bg-[#333] text-white text-2xl font-medium py-5 active:bg-[#444] transition-colors';
    }
    switch (type) {
      case 'fn': return 'rounded-2xl bg-[#a5a5a5] text-black text-xl font-medium py-5 active:bg-[#b8b8b8] transition-colors';
      case 'op': return 'rounded-2xl bg-[#ff9f0a] text-white text-2xl font-medium py-5 active:bg-[#ffb340] transition-colors';
      default: return 'rounded-2xl bg-[#333] text-white text-2xl font-medium py-5 active:bg-[#444] transition-colors';
    }
  };

  return (
    <div className="calculator-body flex flex-col items-center justify-center min-h-screen px-4 py-6">
      <div className="w-full max-w-xs">
        {/* Display */}
        <div className="calculator-display text-right text-white text-6xl font-extralight py-8 px-4 truncate">
          {display}
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-4 gap-3">
          {buttons.map((btn) => (
            <button
              key={btn.label}
              onClick={btn.action}
              className={getButtonClass(btn.type, btn.label)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
