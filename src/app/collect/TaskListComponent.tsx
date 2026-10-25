// @ts-nocheck
import { useState } from 'react'
import { Trash2, MapPin, Weight, Calendar as CalendarIcon, Navigation, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from './StatusBadge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns'
import Papa from 'papaparse'
import { DatePickerWithRange } from './DatePickerWithRange'
import { DateRange } from 'react-day-picker'

interface CollectionTask {
  id: number
  location: string
  wasteType: string
  amount: string
  status: 'pending' | 'in_progress' | 'completed' | 'verified'
  date: string
  collectorId: number | null
  latitude: number
  longitude: number
}

interface TaskListProps {
  tasks: CollectionTask[]
  searchTerm: string
  currentPage: number
  pageCount: number
  setCurrentPage: (page: number) => void
  handleStatusChange: (taskId: number, newStatus: CollectionTask['status']) => Promise<void>
  user: { id: number; email: string; name: string; role?: string } | null
  setSelectedTask: (task: CollectionTask | null) => void
  navigateToTask: (task: CollectionTask) => void
}

export const TaskListComponent = ({
  tasks,
  searchTerm,
  currentPage,
  pageCount,
  setCurrentPage,
  handleStatusChange,
  user,
  setSelectedTask,
  navigateToTask
}: TaskListProps) => {
  const [hoveredWasteType, setHoveredWasteType] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [selectedLocation, setSelectedLocation] = useState<string>("")
  const ITEMS_PER_PAGE = 5

  const uniqueLocations = Array.from(new Set(tasks.map(task => task.location)))

  const filteredTasks = tasks.filter(task =>
    task.location.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Filter tasks based on selected date range and location
  const getFilteredReportData = () => {
    let filteredData = [...tasks]

    if (dateRange?.from) {
      filteredData = filteredData.filter(task => {
        try {
          const taskDate = parseISO(task.date);
          console.log("Parsed task date:", taskDate);

          if (dateRange.to) {
            return isWithinInterval(taskDate, {
              start: startOfDay(dateRange.from),
              end: endOfDay(dateRange.to)
            });
          } else {
            return taskDate >= startOfDay(dateRange.from);
          }
        } catch (error) {
          console.error("Error parsing date:", task.date, error);
          return false;
        }
      });
    }

    if (selectedLocation && selectedLocation !== "all_locations") {
      filteredData = filteredData.filter(task => task.location === selectedLocation)
    }

    return filteredData
  }

  // Check if there's any data to download based on current filters
  const filteredData = getFilteredReportData()
  const hasFilteredData = filteredData.length > 0
  const hasAppliedFilters = dateRange?.from || selectedLocation

  // Download CSV
  const downloadCSV = () => {
    // Add date range info to filename if available
    let filename = `waste_collection_report_${format(new Date(), 'yyyy-MM-dd')}`;
    if (dateRange?.from && dateRange?.to) {
      filename = `waste_collection_report_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}`;
    } else if (dateRange?.from) {
      filename = `waste_collection_report_from_${format(dateRange.from, 'yyyy-MM-dd')}`;
    }
    if (selectedLocation && selectedLocation !== "all_locations") {
      filename += `_${selectedLocation.replace(/\s+/g, '_')}`;
    }

    // Prepare data for CSV format
    const csvData = filteredData.map(task => ({
      ID: task.id,
      Location: task.location,
      'Waste Type': task.wasteType,
      Amount: task.amount,
      Status: task.status,
      Date: task.date,
      'Collector ID': task.collectorId || 'N/A',
      Latitude: task.latitude,
      Longitude: task.longitude
    }))

    // Generate CSV
    const csv = Papa.unparse(csvData)

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const resetFilters = () => {
    setDateRange(undefined)
    setSelectedLocation("")
  }

  const isAdminOrAuthority = user?.role === 'Admin' || user?.role === 'Authority'
  const isAdmin = user?.role === 'Admin'
  const isReporter = user?.role === 'reporter'

  // Helper function to determine if user can start collection
  const canStartCollection = (task: CollectionTask) => {
    return task.status === 'pending'
  }

  // Helper function to determine if user can complete and verify
  const canCompleteAndVerify = (task: CollectionTask) => {
    if (task.status !== 'in_progress') return false

    // Admin can always complete and verify
    if (isAdmin) return true

    // Non-reporter users can complete and verify if they are the assigned collector
    if (!isReporter && task.collectorId === user?.id) return true

    return false
  }

  return (
    <>
      <div className="space-y-4">
        {isAdminOrAuthority && (
          <div className="flex justify-end mb-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="default" className="bg-black hover:bg-gray-800 text-white px-11">
                  <FileText className="w-4 h-4 mr-3" />
                  Generate Report
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Generate Waste Collection Report</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label htmlFor="date" className="text-sm font-medium">Filter by Date Range (Optional)</label>
                    <DatePickerWithRange
                      date={dateRange}
                      setDate={setDateRange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="location" className="text-sm font-medium">Filter by Location (Optional)</label>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_locations">All Locations</SelectItem>
                        {uniqueLocations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-between mt-4">
                    <Button variant="outline" onClick={resetFilters}>
                      Reset Filters
                    </Button>
                    <Button
                      onClick={downloadCSV}
                      disabled={!hasAppliedFilters || !hasFilteredData}
                      title={!hasAppliedFilters ? "Please select filters first" :
                        !hasFilteredData ? "No data matches the selected filters" :
                          "Download CSV report"}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {paginatedTasks.map(task => (
          <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-medium text-gray-800 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-gray-500" />
                {task.location}
              </h2>
              <StatusBadge status={task.status} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm text-gray-600 mb-3">
              <div className="flex items-center relative">
                <Trash2 className="w-4 h-4 mr-2 text-gray-500" />
                <span
                  onMouseEnter={() => setHoveredWasteType(task.wasteType)}
                  onMouseLeave={() => setHoveredWasteType(null)}
                  className="cursor-pointer"
                >
                  {task.wasteType.length > 8 ? `${task.wasteType.slice(0, 8)}...` : task.wasteType}
                </span>
                {hoveredWasteType === task.wasteType && (
                  <div className="absolute left-0 top-full mt-1 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">{task.wasteType}</div>
                )}
              </div>
              <div className="flex items-center">
                <Weight className="w-4 h-4 mr-2 text-gray-500" />
                {task.amount}
              </div>
              <div className="flex items-center">
                <CalendarIcon className="w-4 h-4 mr-2 text-gray-500" />
                {task.date}
              </div>
            </div>
            <div className="flex justify-end">
              {/* Pending status - show navigation and start collection buttons */}
              {canStartCollection(task) && (
                <>
                  <Button
                    onClick={() => navigateToTask(task)}
                    variant="outline"
                    size="sm"
                    className="mr-2"
                  >
                    <Navigation className="w-4 h-4 mr-1" />
                    Navigate
                  </Button>
                  <Button onClick={() => handleStatusChange(task.id, 'in_progress')} variant="outline" size="sm">
                    Start Collection
                  </Button>
                </>
              )}

              {/* In progress status - show complete and verify button based on role */}
              {task.status === 'in_progress' && canCompleteAndVerify(task) && (
                <Button onClick={() => setSelectedTask(task)} variant="outline" size="sm">
                  Complete & Verify
                </Button>
              )}

              {/* In progress but user cannot complete (not admin and either reporter or not assigned collector) */}
              {task.status === 'in_progress' && !canCompleteAndVerify(task) && (
                <span className="text-yellow-600 text-sm font-medium">
                  {task.collectorId !== user?.id
                    ? "In progress by another collector"
                    : "Only admin can verify completion"}
                </span>
              )}

              {/* Verified status */}
              {task.status === 'verified' && (
                <span className="text-green-600 text-sm font-medium">Reward Earned</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-center">
        <Button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="mr-2"
        >
          Previous
        </Button>
        <span className="mx-2 self-center">Page {currentPage} of {pageCount}</span>
        <Button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, pageCount))}
          disabled={currentPage === pageCount}
          className="ml-2"
        >
          Next
        </Button>
      </div>
    </>
  )
}