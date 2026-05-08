document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.querySelector('#requestsTable tbody');
    const emptyMsg = document.getElementById('emptyMsg');
    const downloadBtn = document.getElementById('downloadCsv');
    const table = document.getElementById('requestsTable');
    
    // 로컬 스토리지에서 상담 데이터 불러오기
    const requests = JSON.parse(localStorage.getItem('consultRequests') || '[]');

    if (requests.length === 0) {
        emptyMsg.style.display = 'block';
        table.style.display = 'none';
        downloadBtn.style.display = 'none';
        return;
    }

    // 테이블에 데이터 렌더링
    requests.forEach(req => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${req.date}</td>
            <td>${req.name}</td>
            <td>${req.email}</td>
            <td>${req.phone}</td>
            <td>${req.product}</td>
        `;
        tbody.appendChild(tr);
    });

    // CSV 파일 생성 및 다운로드 함수
    downloadBtn.addEventListener('click', () => {
        // 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM(\uFEFF)을 추가합니다.
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        
        // 헤더 추가
        csvContent += "접수일시,이름,이메일,전화번호,선택 상품\r\n";

        // 데이터 행 추가
        requests.forEach(req => {
            // 내용 안에 쉼표(,)가 있을 수 있으므로 따옴표로 감싸서 처리
            const row = [
                `"${req.date}"`,
                `"${req.name}"`,
                `"${req.email}"`,
                `"${req.phone}"`,
                `"${req.product}"`
            ].join(',');
            csvContent += row + "\r\n";
        });

        // 다운로드 트리거
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "상담신청목록_데이터.csv");
        
        // 보이지 않는 링크를 추가해서 클릭 이벤트를 발생시키고 바로 삭제
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});
