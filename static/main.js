document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const queryInput = document.getElementById('query');
    const resultsContainer = document.getElementById('results');
    const similarityChartElement = document.getElementById('similarity-chart');
    const validationMessage = document.getElementById('validation-message');
    let chartInstance = null;

    // Ensure Chart.js library is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js library is not loaded. Please make sure it is included in the HTML.');
        return;
    }

    const similarityChart = similarityChartElement ? similarityChartElement.getContext('2d') : null;
    if (!similarityChart) {
        console.error('Cannot find similarity chart element. Please ensure it exists in the HTML.');
        return;
    }

    searchForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const query = queryInput.value.trim();

        if (!query) {
            if (validationMessage) {
                validationMessage.textContent = 'Please enter a search query.';
                validationMessage.style.display = 'block';
            }
            return;
        } else if (validationMessage) {
            validationMessage.style.display = 'none';
        }

        try {
            const response = await fetch('/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({ query }),
            });

            if (!response.ok) {
                throw new Error('Error fetching search results.');
            }

            const results = await response.json();
            displayResults(results);
            displayChart(results);
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while fetching search results. Please try again later.');
        }
    });

    function displayResults(results) {
        resultsContainer.innerHTML = '';

        if (results.error) {
            resultsContainer.innerHTML = `<p>${results.error}</p>`;
            return;
        }

        results.forEach((result, index) => {
            const resultDiv = document.createElement('div');
            resultDiv.classList.add('result');

            const titleElement = document.createElement('h3');
            titleElement.textContent = `Document ${index + 1}`;
            resultDiv.appendChild(titleElement);

            const snippetElement = document.createElement('p');
            snippetElement.textContent = result.snippet;
            resultDiv.appendChild(snippetElement);

            const similarityElement = document.createElement('p');
            similarityElement.classList.add('similarity');
            similarityElement.textContent = `Similarity: ${result.similarity.toFixed(2)}`;
            resultDiv.appendChild(similarityElement);

            resultsContainer.appendChild(resultDiv);
        });
    }

    function displayChart(data) {
        if (!similarityChart) {
            console.warn('No context available for similarity chart. Skipping chart rendering.');
            return;
        }

        const labels = data.map((_, index) => `Document ${index + 1}`);
        const similarities = data.map((result) => result.similarity);

        if (similarities.length === 0) {
            console.warn('No data available for chart rendering.');
            return;
        }

        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(similarityChart, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Cosine Similarity',
                    data: similarities,
                    backgroundColor: 'rgba(0, 123, 255, 0.5)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 1,
                }],
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                    },
                },
            },
        });
    }
});