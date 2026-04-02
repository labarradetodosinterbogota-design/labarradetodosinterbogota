import React, { type ComponentProps } from 'react';
import { Download, Eye, Lock } from 'lucide-react';
import { Badge, Button } from '../atoms';
import { Document, DocumentCategory } from '../../types';
import { documentCategoryLabels } from '../../locales/es';

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>['variant']>;

interface DocumentCardProps {
  document: Document;
  onView?: (document: Document) => void;
  onDownload?: (document: Document) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onView,
  onDownload,
}) => {
  const getCategoryColor = (category: DocumentCategory): BadgeVariant => {
    const colors: Record<DocumentCategory, BadgeVariant> = {
      [DocumentCategory.CONSTITUTION]: 'primary',
      [DocumentCategory.POLICIES]: 'warning',
      [DocumentCategory.LEGAL]: 'error',
      [DocumentCategory.TAX]: 'secondary',
      [DocumentCategory.TRANSPARENCY]: 'success',
      [DocumentCategory.OTHER]: 'info',
    };
    return colors[category];
  };

  return (
    <div className="bg-white rounded-lg border border-dark-200 p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-dark-900">{document.title}</h3>
          <p className="text-sm text-dark-500 mt-1">{documentCategoryLabels[document.category]}</p>
        </div>
        <Badge variant={getCategoryColor(document.category)} size="sm">
          {document.is_public ? 'Público' : <Lock className="w-3 h-3" />}
        </Badge>
      </div>

      {document.description && (
        <p className="text-sm text-dark-600 line-clamp-2 mb-3">{document.description}</p>
      )}

      <div className="flex gap-2">
        {onView && (
          <Button variant="outline" size="sm" onClick={() => onView(document)} className="flex-1">
            <Eye className="w-4 h-4 mr-1" />
            Ver
          </Button>
        )}
        {onDownload && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onDownload(document)}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-1" />
            Descargar
          </Button>
        )}
      </div>
    </div>
  );
};
