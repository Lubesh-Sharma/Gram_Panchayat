// Demographics Chart
var demographicsCtx = document.getElementById('demographicsChart').getContext('2d');
var demographicsChart = new Chart(demographicsCtx, {
    type: 'pie',
    data: {
        labels: ['Men', 'Women', 'Children'],
        datasets: [{
            data: [42, 40, 18],
            backgroundColor: [
                '#4e73df',
                '#1cc88a',
                '#36b9cc'
            ],
            hoverBackgroundColor: [
                '#2e59d9',
                '#17a673',
                '#2c9faf'
            ],
            hoverBorderColor: "rgba(234, 236, 244, 1)",
        }]
    },
    options: {
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom'
            }
        }
    }
});

// Agriculture Chart
var agricultureCtx = document.getElementById('agricultureChart').getContext('2d');
var agricultureChart = new Chart(agricultureCtx, {
    type: 'bar',
    data: {
        labels: ['Wheat', 'Rice', 'Pulses', 'Vegetables', 'Fruits'],
        datasets: [{
            label: 'Production (tonnes)',
            data: [450, 320, 150, 180, 90],
            backgroundColor: [
                '#f6c23e',
                '#e74a3b',
                '#1cc88a',
                '#36b9cc',
                '#4e73df'
            ]
        }]
    },
    options: {
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Production (tonnes)'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Crops'
                }
            }
        }
    }
});
