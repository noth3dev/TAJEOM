interface School {
    SCHUL_NM: string;
    SCHUL_KND_SC_NM: string;
    ORG_RDNMA: string;
    SD_SCHUL_CODE: string;
    ATPT_OFCDC_SC_CODE: string;
}

interface NeisResponse {
    schoolInfo?: Array<{
        head?: Array<{ list_total_count: number }>;
        row?: School[];
    }>;
}

export interface SchoolInfo {
    name: string;
    type: string;
    address: string;
    code: string;
    officeCode: string;
}

export async function searchSchools(query: string): Promise<SchoolInfo[]> {
    if (!query || query.length < 2) return [];

    const apiKey = process.env.NEXT_PUBLIC_NEIS_API_KEY || '';
    const url = `https://open.neis.go.kr/hub/schoolInfo?KEY=${apiKey}&Type=json&pIndex=1&pSize=20&SCHUL_NM=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url);
        const data: NeisResponse = await response.json();

        if (!data.schoolInfo || !data.schoolInfo[1]?.row) {
            return [];
        }

        return data.schoolInfo[1].row
            .filter((school) =>
                ['초등학교', '중학교', '고등학교'].includes(school.SCHUL_KND_SC_NM)
            )
            .map((school) => ({
                name: school.SCHUL_NM,
                type: school.SCHUL_KND_SC_NM,
                address: school.ORG_RDNMA,
                code: school.SD_SCHUL_CODE,
                officeCode: school.ATPT_OFCDC_SC_CODE,
            }));
    } catch (error) {
        console.error('Failed to search schools:', error);
        return [];
    }
}
