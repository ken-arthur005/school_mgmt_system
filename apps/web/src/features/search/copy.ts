export const searchCopy = {
  title: 'Search',
  label: 'Name, admission number or phone number',
  students: 'Students',
  parents: 'Parents',
  start: 'Type a name, an admission number or a parent’s phone number.',
  noStudents: 'No student matches.',
  noParents: 'No parent matches.',
  more: (shown: number, total: number) =>
    `Showing ${shown} of ${total}. Type more to narrow it down.`,
  help: {
    title: 'Search',
    lines: [
      'Type any part of a name. Two words must both match.',
      'A phone number finds the parent and their children, however you type it.',
      'You only see people you are allowed to see.',
    ],
  },
};
