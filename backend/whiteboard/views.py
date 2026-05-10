from rest_framework import views, status, permissions
from rest_framework.response import Response
from .models import SavedWhiteboard

class LibraryView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        boards = SavedWhiteboard.objects.filter(teacher=request.user).order_by('-created_at')
        data = [
            {
                "id": board.id,
                "title": board.title,
                "snapshot": board.snapshot,
                "created_at": board.created_at
            }
            for board in boards
        ]
        return Response(data)

    def post(self, request):
        title = request.data.get('title', 'Untitled Board')
        snapshot = request.data.get('snapshot')
        
        if not snapshot:
            return Response({"error": "Snapshot data is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        board = SavedWhiteboard.objects.create(
            teacher=request.user,
            title=title,
            snapshot=snapshot
        )
        return Response({"message": "Board saved successfully", "id": board.id}, status=status.HTTP_201_CREATED)
