"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllocationDonut = AllocationDonut;
const react_1 = __importDefault(require("react"));
const recharts_1 = require("recharts");
const lucide_react_1 = require("lucide-react");
function CustomTooltip({ active, payload }) {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (<div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }}/>
          <span className="font-semibold">{data.ticker}</span>
        </div>
        <div className="text-sm text-gray-600">
          <div>Value: {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(data.value)}</div>
          <div>Allocation: {data.percentage.toFixed(2)}%</div>
        </div>
      </div>);
    }
    return null;
}
function CustomLegend({ payload }) {
    if (!payload)
        return null;
    return (<div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry, index) => (<div key={index} className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}/>
          <span className="font-medium">{entry.value}</span>
          <span className="text-muted-foreground">
            {entry.payload.percentage.toFixed(1)}%
          </span>
        </div>))}
    </div>);
}
function AllocationDonut({ data, isLoading = false }) {
    if (isLoading) {
        return (<div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-muted-foreground">
          <lucide_react_1.Loader2 className="h-5 w-5 animate-spin"/>
          <span>Loading allocation data...</span>
        </div>
      </div>);
    }
    if (!data || data.length === 0) {
        return (<div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">No allocation data</div>
          <div className="text-sm">Add positions to see allocation breakdown</div>
        </div>
      </div>);
    }
    const totalShown = data.reduce((sum, item) => sum + item.percentage, 0);
    const othersPercentage = Math.max(0, 100 - totalShown);
    const chartData = [...data];
    if (othersPercentage > 0) {
        chartData.push({
            ticker: 'Others',
            value: 0,
            percentage: othersPercentage,
            color: '#9ca3af'
        });
    }
    return (<div className="w-full">
      <recharts_1.ResponsiveContainer width="100%" height={300}>
        <recharts_1.PieChart>
          <recharts_1.Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={2} dataKey="percentage" animationBegin={0} animationDuration={800}>
            {chartData.map((entry, index) => (<recharts_1.Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} strokeWidth={2}/>))}
          </recharts_1.Pie>
          <recharts_1.Tooltip content={<CustomTooltip />}/>
          <recharts_1.Legend content={<CustomLegend />} wrapperStyle={{ paddingTop: '20px' }}/>
        </recharts_1.PieChart>
      </recharts_1.ResponsiveContainer>
      
      
      <div className="mt-4 grid grid-cols-2 gap-4 text-center text-sm">
        <div>
          <div className="font-semibold text-lg">{data.length}</div>
          <div className="text-muted-foreground">Top Positions</div>
        </div>
        <div>
          <div className="font-semibold text-lg">{totalShown.toFixed(1)}%</div>
          <div className="text-muted-foreground">Coverage</div>
        </div>
      </div>

      
      {data.some(item => item.percentage > 60) && (<div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2 text-orange-800 text-sm">
            <div className="w-2 h-2 bg-orange-500 rounded-full"/>
            <span className="font-medium">High concentration detected</span>
          </div>
          <div className="text-xs text-orange-700 mt-1">
            Consider diversifying positions above 60% allocation
          </div>
        </div>)}
    </div>);
}
//# sourceMappingURL=AllocationDonut.js.map