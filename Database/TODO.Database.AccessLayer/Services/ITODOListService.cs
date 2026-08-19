using TODO.Database.Models.Core;

namespace TODO.Database.AccessLayer.Services
{
    public interface ITODOListService
    {
        TODOList? GetItem(string title);
        IEnumerable<TODOList> GetAll();
        TODOList AddItem(TODOList tODOListItem);
        TODOList? UpdateItem(string title, TODOList updatedItem);
        TODOList? ToggleStatus(string title);
        bool DeleteItem(string title);
        bool ClearCompleted();
    }
}
