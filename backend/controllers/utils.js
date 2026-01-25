import Semester1 from '../models/Semester1.js';
import Semester2 from '../models/Semester2.js';
import Semester3 from '../models/Semester3.js';
import Semester4 from '../models/Semester4.js';
import Semester5 from '../models/Semester5.js';
import Semester6 from '../models/Semester6.js';
import Semester7 from '../models/Semester7.js';

import Semester8 from '../models/Semester8.js';

export const getSemesterModel = (semNumber) => {
  switch (Number(semNumber)) {
    case 1: return Semester1;
    case 2: return Semester2;
    case 3: return Semester3;
    case 4: return Semester4;
    case 5: return Semester5;
    case 6: return Semester6;
    case 7: return Semester7;
    case 8: return Semester8;
    default: throw new Error("Invalid Semester Number");
  }
};