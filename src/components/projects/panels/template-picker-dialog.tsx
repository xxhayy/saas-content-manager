"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  getTemplatesByCategory,
  type ProjectTemplate,
} from "@/lib/project-templates";

interface TemplatePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: ProjectTemplate) => void;
}

export function TemplatePickerDialog({
  open,
  onClose,
  onSelect,
}: TemplatePickerDialogProps) {
  const grouped = getTemplatesByCategory();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
          {Object.entries(grouped).map(([category, templates]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    className="group relative rounded-lg overflow-hidden border border-border hover:border-primary transition-colors text-left"
                    onClick={() => onSelect(template)}
                  >
                    <div className="aspect-video bg-muted">
                      <img
                        src={template.thumbnailUrl}
                        alt={template.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="text-sm font-medium leading-none">
                        {template.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {template.description}
                      </p>
                      <div className="mt-2">
                        <Badge variant="outline" className="text-[10px] py-0">
                          {template.slots.filter((s) => s.required).length}{" "}
                          required slot
                          {template.slots.filter((s) => s.required).length !== 1
                            ? "s"
                            : ""}
                        </Badge>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors rounded-lg" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
