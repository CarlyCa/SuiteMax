type SuiteLocationGroup = {
  label: string;
  locations: string[];
};

function range(prefix: string, start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => {
    const number = String(start + index).padStart(2, '0');
    return `${prefix}${number}`;
  });
}

export const hornetsSuiteLocationGroups: SuiteLocationGroup[] = [
  {
    label: 'Theater Box',
    locations: range('B', 1, 9).map((code) => `Theater Box ${code}`)
  },
  {
    label: 'Founders Suite',
    locations: range('F', 1, 17).map((code) => `Founders Suite ${code}`)
  },
  {
    label: 'Mini Suite',
    locations: range('M', 1, 13).map((code) => `Mini Suite ${code}`)
  },
  {
    label: 'Party Suite',
    locations: range('P', 1, 4).map((code) => `Party Suite ${code}`)
  },
  {
    label: 'Annual Suite',
    locations: range('S', 1, 28).map((code) => `Annual Suite ${code}`)
  },
  {
    label: 'Super Suite',
    locations: ['Super Suite']
  }
];
