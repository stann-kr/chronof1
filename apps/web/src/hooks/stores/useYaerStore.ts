import { create } from "zustand";
import { CURRENT_YEAR, getDecadeForYear, IDecade } from "../../utils/getDecadeRange";


interface ICalendarState {
    selectedDecade: IDecade;
    selectedYear: number | null;
    setDecade: (decade: IDecade) => void;
    setYear: (year: number) => void;
}

export const useYearStore = create<ICalendarState>((set) => {
    const savedYear = sessionStorage.getItem('selectedYear');
    const parseYear = savedYear ? JSON.parse(savedYear) : CURRENT_YEAR;
    const initialDecade = getDecadeForYear(parseYear);

    return {
    selectedDecade: initialDecade,
    selectedYear:  parseYear,
    setDecade: (decade) => set({ selectedDecade: decade }),
    setYear: (year) => set({ selectedYear: year }),  
    }
});

// 탭 닫힐 때 데이터 제거
window.addEventListener('beforeunload', () => {
    sessionStorage.removeItem('selectedYear')
  })