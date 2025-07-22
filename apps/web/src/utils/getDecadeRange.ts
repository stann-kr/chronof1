export type IDecade = {
    startYear: number;
    endYear: number;
}

export const CURRENT_YEAR = new Date().getFullYear(); // 현재 년도 ( ex: 2025 )
export const INITIAL_YEAR = 1980; // 초기 년도 임시


// 년도 범위 배열 ( ex 2020s, 2010s, 1990s... )
export const getDecades = (startYear: number, endYear: number):IDecade[] => {
    const decades: IDecade[] = [];

    for(let year = startYear; year <= endYear; year += 10) {
        decades.push({
            startYear: year,
            endYear: Math.min(year + 9, endYear),
        });
    }
    return decades.reverse();
}

// 선택 년도 목록 ( 2020, 2021, 2022 ... 2025 ) 
export const getYearsOfSelectedDecade = (startYear: number, endYear: number): number[] => {
    return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
}

/**
 * 특정 년도가 포함된 decade 정보를 계산
 * @param year - 기준이 되는 년도
 * @returns IDecade 객체 { startYear, endYear }
 */
const getDecadeInfo = (year: number): IDecade => {
    const startYear = Math.floor(year / 10) * 10;
    const endYear = Math.min(startYear + 9, CURRENT_YEAR);
    return { startYear, endYear };
  };

  export const getDecadeForYear = (year: number): IDecade => {
    return getDecadeInfo(year);
  };