import React from "react"

const ResultsTable = () => {
    // TODO :: 추후 데이터 연동 시 동적으로 생성
    const rowData = ['grand prx', 'date', 'winner', 'team', 'laps', 'time'];


    return(
        <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 text-black">
                    <tr>
                        {
                            rowData.map((data) => (
                                <th key={data} className="px-6 py-3 text-left uppercase">{data}</th>
                            ))
                        }
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>먀먀</td>
                    </tr>
                </tbody>
            </table>
    )
}

export default ResultsTable;