export const classCopy = {
  title: 'Classes',
  empty: 'You have no classes this year.',
  students: (count: number) => (count === 1 ? '1 student' : `${count} students`),
  noFormTeacher: 'No class teacher',
  mine: 'My class',
  print: 'Print list',
  listEmpty: 'No students in this class.',
  help: {
    title: 'Classes',
    lines: [
      'Open a class to see its students.',
      'You see the classes your role allows: all of them for the office.',
    ],
  },
  listHelp: {
    title: 'Class list',
    lines: ['Tap a student to open their profile.', '“Print list” prints this class on paper.'],
  },
};
