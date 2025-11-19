import React, { useState, useRef } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import ExcelJS from 'exceljs'
import './App.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

function App() {
  const [csvData, setCsvData] = useState([])
  const [headers, setHeaders] = useState([])
  const [selectedXColumn, setSelectedXColumn] = useState('')
  const [selectedYColumn, setSelectedYColumn] = useState('')
  const [xFormula, setXFormula] = useState('')
  const [yFormula, setYFormula] = useState('')
  const [chartTitle, setChartTitle] = useState('グラフタイトル')
  const [xAxisLabel, setXAxisLabel] = useState('X軸')
  const [yAxisLabel, setYAxisLabel] = useState('Y軸')
  const [chartType, setChartType] = useState('line')
  const chartRef = useRef(null)

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) {
      processFile(file)
    }
  }

  const processFile = (file) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.split('\n').filter(line => line.trim())
      if (lines.length > 0) {
        const headerLine = lines[0].split(',').map(h => h.trim())
        setHeaders(headerLine)
        setSelectedXColumn(headerLine[0])
        setSelectedYColumn(headerLine[1] || headerLine[0])
        
        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim())
          const row = {}
          headerLine.forEach((header, index) => {
            row[header] = values[index]
          })
          return row
        })
        setCsvData(data)
      }
    }
    reader.readAsText(file)
  }

  const evaluateFormula = (formula, value, columnName) => {
    if (!formula) return parseFloat(value) || 0
    try {
      const code = formula.replace(new RegExp(columnName, 'g'), value)
      return eval(code)
    } catch {
      return parseFloat(value) || 0
    }
  }

  const getChartData = () => {
    if (!csvData.length || !selectedXColumn || !selectedYColumn) {
      return { labels: [], datasets: [] }
    }

    const labels = csvData.map(row => {
      const value = row[selectedXColumn]
      return evaluateFormula(xFormula, value, selectedXColumn)
    })

    const data = csvData.map(row => {
      const value = row[selectedYColumn]
      return evaluateFormula(yFormula, value, selectedYColumn)
    })

    return {
      labels,
      datasets: [
        {
          label: yAxisLabel,
          data,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          tension: 0.1,
        },
      ],
    }
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: chartTitle,
        font: { size: 18 },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: xAxisLabel,
        },
      },
      y: {
        title: {
          display: true,
          text: yAxisLabel,
        },
      },
    },
  }

  const copyChartToClipboard = async () => {
    if (chartRef.current) {
      const canvas = chartRef.current.canvas
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ])
          alert('グラフをクリップボードにコピーしました')
        } catch (err) {
          alert('コピーに失敗しました')
        }
      })
    }
  }

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('グラフデータ')

    const chartData = getChartData()
    worksheet.addRow([xAxisLabel, yAxisLabel])
    chartData.labels.forEach((label, index) => {
      worksheet.addRow([label, chartData.datasets[0].data[index]])
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'graph_data.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app">
      <div className="container">
        <h1 className="title">📊 CSV Graph Reporter</h1>
        
        <div className="upload-section"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="upload-box">
            <p>📁 CSVファイルをドラッグ＆ドロップ</p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              id="file-input"
              style={{ display: 'none' }}
            />
            <label htmlFor="file-input" className="upload-button">
              ファイルを選択
            </label>
          </div>
        </div>

        {csvData.length > 0 && (
          <>
            <div className="preview-section">
              <h2>📋 データプレビュー</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      {headers.map((header, i) => (
                        <th key={i}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {headers.map((header, j) => (
                          <td key={j}>{row[header]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="config-section">
              <h2>⚙️ グラフ設定</h2>
              <div className="config-grid">
                <div className="config-item">
                  <label>グラフタイトル</label>
                  <input
                    type="text"
                    value={chartTitle}
                    onChange={(e) => setChartTitle(e.target.value)}
                  />
                </div>
                <div className="config-item">
                  <label>グラフタイプ</label>
                  <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
                    <option value="line">折れ線グラフ</option>
                    <option value="bar">棒グラフ</option>
                  </select>
                </div>
                <div className="config-item">
                  <label>X軸データ列</label>
                  <select value={selectedXColumn} onChange={(e) => setSelectedXColumn(e.target.value)}>
                    {headers.map((header, i) => (
                      <option key={i} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
                <div className="config-item">
                  <label>X軸計算式 (例: {selectedXColumn}*2+180)</label>
                  <input
                    type="text"
                    value={xFormula}
                    onChange={(e) => setXFormula(e.target.value)}
                    placeholder={`そのまま使用する場合は空欄`}
                  />
                </div>
                <div className="config-item">
                  <label>X軸ラベル</label>
                  <input
                    type="text"
                    value={xAxisLabel}
                    onChange={(e) => setXAxisLabel(e.target.value)}
                  />
                </div>
                <div className="config-item">
                  <label>Y軸データ列</label>
                  <select value={selectedYColumn} onChange={(e) => setSelectedYColumn(e.target.value)}>
                    {headers.map((header, i) => (
                      <option key={i} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
                <div className="config-item">
                  <label>Y軸計算式 (例: {selectedYColumn}*1.5)</label>
                  <input
                    type="text"
                    value={yFormula}
                    onChange={(e) => setYFormula(e.target.value)}
                    placeholder={`そのまま使用する場合は空欄`}
                  />
                </div>
                <div className="config-item">
                  <label>Y軸ラベル</label>
                  <input
                    type="text"
                    value={yAxisLabel}
                    onChange={(e) => setYAxisLabel(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="chart-section">
              <div className="chart-actions">
                <button onClick={copyChartToClipboard} className="action-button">
                  📋 グラフをコピー
                </button>
                <button onClick={exportToExcel} className="action-button">
                  📊 Excelに出力
                </button>
              </div>
              <div className="chart-container">
                {chartType === 'line' ? (
                  <Line ref={chartRef} data={getChartData()} options={chartOptions} />
                ) : (
                  <Bar ref={chartRef} data={getChartData()} options={chartOptions} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App
