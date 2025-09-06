"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Grid3X3,
  LayoutGrid,
  Menu,
  X,
  Plus,
  Search,
  Check,
  ChevronDown,
  Upload,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"

type ViewType = "day" | "week" | "month"

interface Event {
  id: string
  title: string
  startDateTime: string // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
  endDateTime: string // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
  color: string
}

interface CalendarOption {
  id: string
  name: string
  color: string
}

const sampleCalendars: CalendarOption[] = [
  { id: "personal", name: "Personal", color: "bg-blue-500" },
  { id: "work", name: "Work", color: "bg-green-500" },
  { id: "family", name: "Family", color: "bg-purple-500" },
  { id: "fitness", name: "Fitness & Health", color: "bg-red-500" },
  { id: "projects", name: "Projects", color: "bg-orange-500" },
  { id: "meetings", name: "Meetings", color: "bg-teal-500" },
  { id: "travel", name: "Travel", color: "bg-pink-500" },
  { id: "education", name: "Education", color: "bg-indigo-500" },
]

const sampleEvents: Event[] = [
  {
    id: "1",
    title: "Team Meeting",
    startDateTime: "2024-12-09T09:00:00.000Z",
    endDateTime: "2024-12-09T10:00:00.000Z",
    color: "bg-chart-1",
  },
  {
    id: "2",
    title: "Project Review",
    startDateTime: "2024-12-09T14:00:00.000Z",
    endDateTime: "2024-12-09T15:30:00.000Z",
    color: "bg-chart-2",
  },
  {
    id: "3",
    title: "Client Call",
    startDateTime: "2024-12-09T16:30:00.000Z",
    endDateTime: "2024-12-09T17:00:00.000Z",
    color: "bg-chart-3",
  },
]

export function CalendarApp() {
  const [currentView, setCurrentView] = useState<ViewType>("month")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false)
  const [isImportEventsOpen, setIsImportEventsOpen] = useState(false)
  const [isCalendarDropdownOpen, setIsCalendarDropdownOpen] = useState(false)
  const [calendarSearch, setCalendarSearch] = useState("")
  const [selectedCalendar, setSelectedCalendar] = useState<CalendarOption | null>(null)
  const [isImportCalendarDropdownOpen, setIsImportCalendarDropdownOpen] = useState(false)
  const [importCalendarSearch, setImportCalendarSearch] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [newEvent, setNewEvent] = useState({
    title: "",
    startDateTime: "",
    endDateTime: "",
    isRecurring: false,
    recurringType: "week",
    recurringCount: 1,
    isInfiniteRecurring: false,
    durationType: "count", // "count" or "endDate"
    recurringEndDate: "",
  })
  const [selectedImportCalendar, setSelectedImportCalendar] = useState<CalendarOption | null>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  const isEventInPast = (eventStartDateTime: string, eventEndDateTime: string): boolean => {
    const now = currentTime
    const eventEnd = new Date(eventEndDateTime)
    return eventEnd < now
  }

  const isEventBisected = (eventStartDateTime: string, eventEndDateTime: string): boolean => {
    const now = currentTime
    const eventStart = new Date(eventStartDateTime)
    const eventEnd = new Date(eventEndDateTime)
    return now >= eventStart && now <= eventEnd
  }

  const formatDateTimeToISO = (date: string, time: string): string => {
    if (!date || !time) return ""
    return new Date(`${date}T${time}:00.000Z`).toISOString()
  }

  const parseISOToDateInput = (isoString: string): string => {
    if (!isoString) return ""
    return new Date(isoString).toISOString().split("T")[0]
  }

  const parseISOToTimeInput = (isoString: string): string => {
    if (!isoString) return ""
    return new Date(isoString).toTimeString().slice(0, 5)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      ...(currentView === "day" && { day: "numeric" }),
    })
  }

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)

    switch (currentView) {
      case "day":
        newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
        break
      case "week":
        newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7))
        break
      case "month":
        newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1))
        break
    }

    setCurrentDate(newDate)
  }

  const handleCreateEvent = () => {
    const dateInput = parseISOToDateInput(newEvent.startDateTime)
    const timeInput = parseISOToTimeInput(newEvent.startDateTime)

    console.log("Creating event:", {
      ...newEvent,
      calendar: selectedCalendar,
      startDateTime: newEvent.startDateTime,
      endDateTime: newEvent.endDateTime,
      parsedDate: dateInput,
      parsedTime: timeInput,
    })

    setNewEvent({
      title: "",
      startDateTime: "",
      endDateTime: "",
      isRecurring: false,
      recurringType: "week",
      recurringCount: 1,
      isInfiniteRecurring: false,
      durationType: "count",
      recurringEndDate: "",
    })
    setSelectedCalendar(null)
    setIsMenuOpen(false)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      handleFiles(Array.from(files))
    }
  }

  const handleFiles = (files: File[]) => {
    console.log(
      "[v0] Importing files:",
      files.map((f) => f.name),
      "to calendar:",
      selectedImportCalendar,
    )
    // Process files here - could be .ics, .csv, etc.
    files.forEach((file) => {
      console.log("[v0] Processing file:", file.name, "type:", file.type)
    })
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const currentTimePosition = currentTime.getHours() * 4 + (currentTime.getMinutes() / 60) * 4 // Updated to use flexible height units

    return (
      <Card className="flex-1 h-full">
        <CardContent className="p-0 h-full">
          <div className="grid grid-cols-[80px_1fr] h-full">
            <div className="border-r border-border flex flex-col">
              {hours.map((hour) => (
                <div key={hour} className="flex-1 border-b border-border flex items-start justify-end pr-2 pt-1">
                  <span className="text-xs text-muted-foreground">{hour.toString().padStart(2, "0")}:00</span>
                </div>
              ))}
            </div>
            <div className="relative flex-1 flex flex-col">
              {hours.map((hour) => (
                <div key={hour} className="flex-1 border-b border-border" />
              ))}
              <div
                className="absolute left-0 right-0 border-t-2 border-red-500 z-20"
                style={{ top: `${(currentTimePosition / (24 * 4)) * 100}%` }} // Updated calculation for flexible height
              >
                <div className="absolute -left-2 -top-1 w-4 h-2 bg-red-500 rounded-full" />
              </div>
              {sampleEvents.map((event) => {
                const startDate = new Date(event.startDateTime)
                const endDate = new Date(event.endDateTime)
                const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60)
                const eventTopPercent =
                  ((startDate.getHours() * 4 + (startDate.getMinutes() / 60) * 4) / (24 * 4)) * 100 // Updated for flexible height
                const eventHeightPercent = (((duration / 60) * 4) / (24 * 4)) * 100 // Updated for flexible height

                const isPast = isEventInPast(event.startDateTime, event.endDateTime)
                const isBisected = isEventBisected(event.startDateTime, event.endDateTime)
                const isSmallEvent = eventHeightPercent < 8 // Less than ~30px height

                if (isBisected) {
                  const bisectionPointPercent = (currentTimePosition / (24 * 4)) * 100 - eventTopPercent // Updated calculation
                  const topHeightPercent = Math.max(0, bisectionPointPercent)
                  const bottomHeightPercent = Math.max(0, eventHeightPercent - bisectionPointPercent)

                  return (
                    <div key={event.id} className="absolute left-2 right-2" style={{ top: `${eventTopPercent}%` }}>
                      {topHeightPercent > 0 && (
                        <div
                          className={cn(
                            "border-2 rounded-t-md p-2 text-sm bg-transparent",
                            event.color.replace("bg-", "border-"),
                            event.color.replace("bg-", "text-"),
                          )}
                          style={{ height: `${topHeightPercent}%` }}
                        >
                          <div className="font-medium">{event.title}</div>
                          <div className="text-xs opacity-70">
                            {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      )}
                      {bottomHeightPercent > 0 && (
                        <div
                          className={cn("rounded-b-md p-2 text-white text-sm", event.color)}
                          style={{ height: `${bottomHeightPercent}%`, marginTop: topHeightPercent > 0 ? "-1px" : "0" }}
                        >
                          {topHeightPercent <= 0 && (
                            <>
                              <div className="font-medium">{event.title}</div>
                              <div className="text-xs opacity-90">
                                {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                }

                if (isSmallEvent && (isPast || eventTopPercent < (currentTimePosition / (24 * 4)) * 100)) {
                  // Updated calculation
                  return (
                    <div
                      key={event.id}
                      className="absolute left-2 right-2 flex items-center"
                      style={{
                        top: `${eventTopPercent}%`,
                        height: `${Math.max(eventHeightPercent, 8)}%`,
                      }}
                    >
                      <div
                        className={cn(
                          "inline-flex items-center px-2 py-1 rounded-full border-2 bg-transparent text-sm font-medium mr-2",
                          event.color.replace("bg-", "border-"),
                          event.color.replace("bg-", "text-"),
                        )}
                        style={{ flexShrink: 0 }}
                      >
                        {event.title}
                      </div>
                      <div
                        className={cn("flex-1 border-2 rounded-r-md", event.color.replace("bg-", "border-"))}
                        style={{
                          height: `${eventHeightPercent}%`,
                          minHeight: "20px",
                        }}
                      />
                    </div>
                  )
                }

                return (
                  <div
                    key={event.id}
                    className={cn(
                      "absolute left-2 right-2 rounded-md p-2 text-sm",
                      isPast || eventTopPercent < (currentTimePosition / (24 * 4)) * 100 // Updated calculation
                        ? `border-2 bg-transparent ${event.color.replace("bg-", "border-")} ${event.color.replace("bg-", "text-")}`
                        : `${event.color} text-white`,
                    )}
                    style={{
                      top: `${eventTopPercent}%`,
                      height: `${eventHeightPercent}%`,
                    }}
                  >
                    <div className="font-medium">{event.title}</div>
                    <div className={cn("text-xs", isPast ? "opacity-70" : "opacity-90")}>
                      {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderWeekView = () => {
    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const hours = Array.from({ length: 24 }, (_, i) => i) // Now shows full 24-hour day
    const currentTimePosition = currentTime.getHours() * 4 + (currentTime.getMinutes() / 60) * 4 // Updated for flexible height

    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1)
    const weekDates = weekDays.map((_, index) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + index)
      return date
    })

    return (
      <Card className="flex-1 h-full">
        <CardContent className="p-0 h-full flex flex-col">
          <div className="grid grid-cols-8 border-b border-border">
            <div className="p-3 border-r border-border"></div>
            {weekDays.map((day, index) => (
              <div key={day} className="p-3 text-center font-medium border-r border-border last:border-r-0">
                <div>{day}</div>
                <div className="text-xs text-muted-foreground">{weekDates[index].getDate()}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-8 flex-1">
            <div className="border-r border-border flex flex-col">
              {hours.map((hour) => (
                <div key={hour} className="flex-1 border-b border-border flex items-center justify-end pr-2">
                  <span className="text-xs text-muted-foreground">{hour.toString().padStart(2, "0")}:00</span>
                </div>
              ))}
            </div>
            {weekDays.map((day, dayIndex) => (
              <div key={day} className="border-r border-border last:border-r-0 relative flex flex-col">
                {hours.map((hour) => (
                  <div key={hour} className="flex-1 border-b border-border" />
                ))}
                {weekDates[dayIndex].toDateString() === currentTime.toDateString() && (
                  <div
                    className="absolute left-0 right-0 border-t-2 border-red-500 z-20"
                    style={{ top: `${(currentTimePosition / (24 * 4)) * 100}%` }} // Updated calculation for flexible height
                  >
                    <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full" />
                  </div>
                )}
                {dayIndex === 2 && (
                  <div
                    className={cn(
                      "absolute left-1 right-1 rounded p-1 text-xs",
                      weekDates[2] < currentTime ||
                        (weekDates[2].toDateString() === currentTime.toDateString() && currentTime.getHours() > 9)
                        ? "border border-chart-1 bg-transparent text-chart-1"
                        : "bg-chart-1 text-white",
                    )}
                    style={{ top: `${((9 * 4) / (24 * 4)) * 100}%` }} // Updated calculation for flexible height
                  >
                    <div className="font-medium">Meeting</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderMonthView = () => {
    const today = new Date()
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const current = new Date(startDate)

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    const handleDayClick = (clickedDay: Date) => {
      setCurrentDate(new Date(clickedDay))
      setCurrentView("day")
    }

    return (
      <Card className="flex-1 h-full">
        <CardContent className="p-4 h-full flex flex-col">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-2 text-center font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 flex-1">
            {days.map((day, index) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth()
              const isToday = day.toDateString() === today.toDateString()
              const hasEvent = day.getDate() === 15 && isCurrentMonth

              return (
                <div
                  key={index}
                  className={cn(
                    "p-2 rounded-md border border-border hover:bg-accent/10 cursor-pointer transition-colors flex flex-col",
                    !isCurrentMonth && "text-muted-foreground bg-muted/30",
                    isToday && "bg-accent text-accent-foreground font-bold",
                  )}
                  onClick={() => handleDayClick(day)}
                >
                  <div className="text-sm">{day.getDate()}</div>
                  {hasEvent && (
                    <div className="mt-1">
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        Event
                      </Badge>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case "day":
        return renderDayView()
      case "week":
        return renderWeekView()
      case "month":
        return renderMonthView()
      default:
        return renderMonthView()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed left-0 top-0 h-full w-80 bg-background border-r border-border z-50 transform transition-transform duration-300 ease-in-out",
          isMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Menu</h2>
            <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="border border-border rounded-lg">
              <Button
                variant="ghost"
                className="w-full justify-between p-4 h-auto"
                onClick={() => setIsCreateEventOpen(!isCreateEventOpen)}
              >
                <div className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span className="font-medium">Create Event</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", isCreateEventOpen && "rotate-180")} />
              </Button>

              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  isCreateEventOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0",
                )}
              >
                <div className="p-4 pt-0 space-y-4">
                  <div>
                    <Label htmlFor="event-title">Event Title</Label>
                    <Input
                      id="event-title"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      placeholder="Enter event title"
                    />
                  </div>

                  <div>
                    <Label>Calendar</Label>
                    <div className="relative">
                      <Button
                        variant="outline"
                        className="w-full justify-between bg-transparent"
                        onClick={() => setIsCalendarDropdownOpen(!isCalendarDropdownOpen)}
                      >
                        {selectedCalendar ? (
                          <div className="flex items-center space-x-2">
                            <div className={cn("w-3 h-3 rounded-full", selectedCalendar.color)} />
                            <span>{selectedCalendar.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Select a calendar</span>
                        )}
                        <ChevronRight
                          className={cn("h-4 w-4 transition-transform", isCalendarDropdownOpen && "rotate-90")}
                        />
                      </Button>

                      {isCalendarDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-10">
                          <div className="p-2 border-b border-border">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search calendars..."
                                value={calendarSearch}
                                onChange={(e) => setCalendarSearch(e.target.value)}
                                className="pl-8"
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {sampleCalendars
                              .filter((calendar) => calendar.name.toLowerCase().includes(calendarSearch.toLowerCase()))
                              .map((calendar) => (
                                <button
                                  key={calendar.id}
                                  className="w-full flex items-center justify-between p-2 hover:bg-accent text-left"
                                  onClick={() => {
                                    setSelectedCalendar(calendar)
                                    setIsCalendarDropdownOpen(false)
                                    setCalendarSearch("")
                                  }}
                                >
                                  <div className="flex items-center space-x-2">
                                    <div className={cn("w-3 h-3 rounded-full", calendar.color)} />
                                    <span>{calendar.name}</span>
                                  </div>
                                  {selectedCalendar?.id === calendar.id && <Check className="h-4 w-4 text-primary" />}
                                </button>
                              ))}
                            {sampleCalendars.filter((calendar) =>
                              calendar.name.toLowerCase().includes(calendarSearch.toLowerCase()),
                            ).length === 0 && (
                              <div className="p-2 text-muted-foreground text-center">No calendars found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ... existing form fields ... */}
                  <div>
                    <Label htmlFor="event-date">Start Date</Label>
                    <Input
                      id="event-date"
                      type="date"
                      value={parseISOToDateInput(newEvent.startDateTime)}
                      onChange={(e) => {
                        const timeValue = parseISOToTimeInput(newEvent.startDateTime) || "09:00"
                        const isoDateTime = formatDateTimeToISO(e.target.value, timeValue)
                        setNewEvent({
                          ...newEvent,
                          startDateTime: isoDateTime,
                          endDateTime: isoDateTime
                            ? new Date(new Date(isoDateTime).getTime() + 60 * 60 * 1000).toISOString()
                            : "",
                        })
                      }}
                      min="1900-01-01"
                      max="2099-12-31"
                    />
                  </div>

                  <div>
                    <Label htmlFor="event-time">Start Time</Label>
                    <Input
                      id="event-time"
                      type="time"
                      value={parseISOToTimeInput(newEvent.startDateTime)}
                      onChange={(e) => {
                        const dateValue =
                          parseISOToDateInput(newEvent.startDateTime) || new Date().toISOString().split("T")[0]
                        const isoDateTime = formatDateTimeToISO(dateValue, e.target.value)
                        setNewEvent({
                          ...newEvent,
                          startDateTime: isoDateTime,
                          endDateTime: isoDateTime
                            ? new Date(new Date(isoDateTime).getTime() + 60 * 60 * 1000).toISOString()
                            : "",
                        })
                      }}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="recurring"
                      checked={newEvent.isRecurring}
                      onCheckedChange={(checked) => setNewEvent({ ...newEvent, isRecurring: !!checked })}
                    />
                    <Label htmlFor="recurring">Recurring Event</Label>
                  </div>

                  {newEvent.isRecurring && (
                    <div className="space-y-4 pl-6 border-l-2 border-border">
                      <div>
                        <Label htmlFor="recurring-type">Repeat</Label>
                        <Select
                          value={newEvent.recurringType}
                          onValueChange={(value) => setNewEvent({ ...newEvent, recurringType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="day">Daily</SelectItem>
                            <SelectItem value="week">Weekly</SelectItem>
                            <SelectItem value="month">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="infinite-recurring"
                          checked={newEvent.isInfiniteRecurring}
                          onCheckedChange={(checked) => setNewEvent({ ...newEvent, isInfiniteRecurring: !!checked })}
                        />
                        <Label htmlFor="infinite-recurring">Repeat infinitely (e.g., birthdays)</Label>
                      </div>

                      {!newEvent.isInfiniteRecurring && (
                        <>
                          <div>
                            <Label>Duration Type</Label>
                            <Select
                              value={newEvent.durationType}
                              onValueChange={(value) => setNewEvent({ ...newEvent, durationType: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="count">Number of occurrences</SelectItem>
                                <SelectItem value="endDate">End date</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {newEvent.durationType === "count" ? (
                            <div>
                              <Label htmlFor="recurring-count">Number of Occurrences</Label>
                              <Input
                                id="recurring-count"
                                type="number"
                                min="1"
                                max="365"
                                value={newEvent.recurringCount}
                                onChange={(e) =>
                                  setNewEvent({ ...newEvent, recurringCount: Number.parseInt(e.target.value) || 1 })
                                }
                              />
                            </div>
                          ) : (
                            <div>
                              <Label htmlFor="recurring-end-date">End Date</Label>
                              <Input
                                id="recurring-end-date"
                                type="date"
                                value={newEvent.recurringEndDate}
                                onChange={(e) => setNewEvent({ ...newEvent, recurringEndDate: e.target.value })}
                                min="1900-01-01"
                                max="2099-12-31"
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <Button onClick={handleCreateEvent} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg">
              <Button
                variant="ghost"
                className="w-full justify-between p-4 h-auto"
                onClick={() => setIsImportEventsOpen(!isImportEventsOpen)}
              >
                <div className="flex items-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span className="font-medium">Import Events</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", isImportEventsOpen && "rotate-180")} />
              </Button>

              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  isImportEventsOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0",
                )}
              >
                <div className="p-4 pt-0 space-y-4">
                  <div>
                    <Label>Import to Calendar</Label>
                    <div className="relative">
                      <Button
                        variant="outline"
                        className="w-full justify-between bg-transparent"
                        onClick={() => setIsImportCalendarDropdownOpen(!isImportCalendarDropdownOpen)}
                      >
                        {selectedImportCalendar ? (
                          <div className="flex items-center space-x-2">
                            <div className={cn("w-3 h-3 rounded-full", selectedImportCalendar.color)} />
                            <span>{selectedImportCalendar.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Select destination calendar</span>
                        )}
                        <ChevronRight
                          className={cn("h-4 w-4 transition-transform", isImportCalendarDropdownOpen && "rotate-90")}
                        />
                      </Button>

                      {isImportCalendarDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-10">
                          <div className="p-2 border-b border-border">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search calendars..."
                                value={importCalendarSearch}
                                onChange={(e) => setImportCalendarSearch(e.target.value)}
                                className="pl-8"
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {sampleCalendars
                              .filter((calendar) =>
                                calendar.name.toLowerCase().includes(importCalendarSearch.toLowerCase()),
                              )
                              .map((calendar) => (
                                <button
                                  key={calendar.id}
                                  className="w-full flex items-center justify-between p-2 hover:bg-accent text-left"
                                  onClick={() => {
                                    setSelectedImportCalendar(calendar)
                                    setIsImportCalendarDropdownOpen(false)
                                    setImportCalendarSearch("")
                                  }}
                                >
                                  <div className="flex items-center space-x-2">
                                    <div className={cn("w-3 h-3 rounded-full", calendar.color)} />
                                    <span>{calendar.name}</span>
                                  </div>
                                  {selectedImportCalendar?.id === calendar.id && (
                                    <Check className="h-4 w-4 text-primary" />
                                  )}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Import Files</Label>

                    {/* Browse Button */}
                    <div>
                      <input
                        type="file"
                        id="file-upload"
                        multiple
                        accept=".ics,.csv,.json"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        className="w-full bg-transparent"
                        onClick={() => document.getElementById("file-upload")?.click()}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Browse Files
                      </Button>
                    </div>

                    {/* Drag and Drop Area */}
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                        dragActive ? "border-primary bg-primary/5" : "border-border",
                        !selectedImportCalendar && "opacity-50 pointer-events-none",
                      )}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-1">Drag and drop files here</p>
                      <p className="text-xs text-muted-foreground">Supports .ics, .csv, and .json files</p>
                      {!selectedImportCalendar && (
                        <p className="text-xs text-destructive mt-2">Please select a destination calendar first</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(isCalendarDropdownOpen || isImportCalendarDropdownOpen) && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => {
            setIsCalendarDropdownOpen(false)
            setIsImportCalendarDropdownOpen(false)
          }}
        />
      )}

      {/* ... existing main content ... */}
      <div
        className={cn(
          "transition-transform duration-300 ease-in-out p-6",
          isMenuOpen ? "transform translate-x-80" : "transform translate-x-0",
        )}
      >
        <div className="max-w-7xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button variant="outline" size="sm" onClick={() => setIsMenuOpen(true)}>
                    <Menu className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-6 w-6 text-primary" />
                    <CardTitle className="text-2xl font-bold">Calendar</CardTitle>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => navigateDate("prev")}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-xl font-semibold min-w-[200px] text-center">{formatDate(currentDate)}</h2>
                    <Button variant="outline" size="sm" onClick={() => navigateDate("next")}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <ThemeToggle />
                  <Button
                    variant={currentView === "day" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentView("day")}
                    className="flex items-center space-x-1"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Day</span>
                  </Button>
                  <Button
                    variant={currentView === "week" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentView("week")}
                    className="flex items-center space-x-1"
                  >
                    <Grid3X3 className="h-4 w-4" />
                    <span>Week</span>
                  </Button>
                  <Button
                    variant={currentView === "month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentView("month")}
                    className="flex items-center space-x-1"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span>Month</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="flex space-x-6 h-[calc(100vh-200px)]">{renderCurrentView()}</div>
        </div>
      </div>
    </div>
  )
}
