/**
 * 학년과 학교 유형을 기반으로 출생년도를 계산합니다.
 * 기준: 2026년 현재
 * 
 * 초등학교: 1학년 = 2019년생, 6학년 = 2014년생
 * 중학교: 1학년 = 2013년생, 3학년 = 2011년생
 * 고등학교: 1학년 = 2010년생, 3학년 = 2008년생
 */
export function calculateBirthYear(grade: number, schoolType: string): number {
    const currentYear = 2026;

    switch (schoolType) {
        case '초등학교':
            // 초등학교 1학년 = 만 7세 (2019년생)
            return currentYear - 6 - grade;
        case '중학교':
            // 중학교 1학년 = 만 13세 (2013년생)
            return currentYear - 12 - grade;
        case '고등학교':
            // 고등학교 1학년 = 만 16세 (2010년생)
            return currentYear - 15 - grade;
        default:
            return currentYear - 15 - grade;
    }
}

export function getGradeOptions(schoolType: string): number[] {
    switch (schoolType) {
        case '초등학교':
            return [1, 2, 3, 4, 5, 6];
        case '중학교':
        case '고등학교':
            return [1, 2, 3];
        default:
            return [1, 2, 3];
    }
}
