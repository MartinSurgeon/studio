import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { Class, ScheduleType, RecurrencePattern } from '@/lib/types';
import { classService } from '@/lib/services/class.service';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface ClassScheduleManagerProps {
  classInstance: Class;
  onScheduleUpdated: (updatedClass: Class) => void;
}

export default function ClassScheduleManager({ classInstance, onScheduleUpdated }: ClassScheduleManagerProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [scheduleType, setScheduleType] = useState<ScheduleType>(classInstance.scheduleType);
  const [durationMinutes, setDurationMinutes] = useState(classInstance.durationMinutes);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(classInstance.gracePeriodMinutes);
  const [autoStart, setAutoStart] = useState(classInstance.autoStart);
  const [autoEnd, setAutoEnd] = useState(classInstance.autoEnd);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern | undefined>(classInstance.recurrencePattern);
  const [endDate, setEndDate] = useState<Date | undefined>(
    recurrencePattern?.endDate ? new Date(recurrencePattern.endDate) : undefined
  );

  const handleSaveSchedule = async () => {
    try {
      setIsLoading(true);
      const updatedClass = {
        ...classInstance,
        scheduleType,
        durationMinutes,
        gracePeriodMinutes,
        autoStart,
        autoEnd,
        recurrencePattern: scheduleType === 'custom' ? {
          frequency: recurrencePattern?.frequency || 'weekly',
          interval: recurrencePattern?.interval || 1,
          daysOfWeek: recurrencePattern?.daysOfWeek,
          daysOfMonth: recurrencePattern?.daysOfMonth,
          endDate: endDate?.toISOString(),
          occurrences: recurrencePattern?.occurrences
        } : undefined
      };

      const savedClass = await classService.updateClass(classInstance.id, updatedClass);
      if (savedClass) {
        onScheduleUpdated(savedClass);
        toast({
          title: 'Schedule Updated',
          description: 'Class schedule has been updated successfully.'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update schedule',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecurrenceChange = (updates: Partial<RecurrencePattern>) => {
    setRecurrencePattern(prev => ({
      ...prev,
      ...updates
    } as RecurrencePattern));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Schedule Type</Label>
          <Select value={scheduleType} onValueChange={(value: ScheduleType) => setScheduleType(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select schedule type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one-time">One Time</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Duration (minutes)</Label>
          <Input
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
            min={15}
            max={480}
          />
        </div>

        <div className="space-y-2">
          <Label>Grace Period (minutes)</Label>
          <Input
            type="number"
            value={gracePeriodMinutes}
            onChange={(e) => setGracePeriodMinutes(parseInt(e.target.value))}
            min={0}
            max={60}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={autoStart}
            onCheckedChange={setAutoStart}
          />
          <Label>Auto-start class at scheduled time</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={autoEnd}
            onCheckedChange={setAutoEnd}
          />
          <Label>Auto-end class after duration</Label>
        </div>

        {scheduleType === 'custom' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Recurrence Pattern</Label>
              <Select
                value={recurrencePattern?.frequency || 'weekly'}
                onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                  handleRecurrenceChange({ frequency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Repeat every</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={recurrencePattern?.interval || 1}
                  onChange={(e) => handleRecurrenceChange({ interval: parseInt(e.target.value) })}
                  min={1}
                  max={99}
                  className="w-20"
                />
                <span>{recurrencePattern?.frequency === 'daily' ? 'days' : 
                       recurrencePattern?.frequency === 'weekly' ? 'weeks' : 'months'}</span>
              </div>
            </div>

            {recurrencePattern?.frequency === 'weekly' && (
              <div className="space-y-2">
                <Label>Repeat on</Label>
                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        checked={recurrencePattern?.daysOfWeek?.includes(index) || false}
                        onCheckedChange={(checked) => {
                          const days = recurrencePattern?.daysOfWeek || [];
                          handleRecurrenceChange({
                            daysOfWeek: checked
                              ? [...days, index]
                              : days.filter(d => d !== index)
                          });
                        }}
                      />
                      <Label>{day}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recurrencePattern?.frequency === 'monthly' && (
              <div className="space-y-2">
                <Label>Repeat on days</Label>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        checked={recurrencePattern?.daysOfMonth?.includes(day) || false}
                        onCheckedChange={(checked) => {
                          const days = recurrencePattern?.daysOfMonth || [];
                          handleRecurrenceChange({
                            daysOfMonth: checked
                              ? [...days, day]
                              : days.filter(d => d !== day)
                          });
                        }}
                      />
                      <Label>{day}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>End Date (Optional)</Label>
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                className="rounded-md border"
              />
            </div>
          </div>
        )}

        <Button
          onClick={handleSaveSchedule}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Saving...' : 'Save Schedule'}
        </Button>
      </CardContent>
    </Card>
  );
} 