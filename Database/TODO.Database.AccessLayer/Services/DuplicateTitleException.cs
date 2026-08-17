namespace TODO.Database.AccessLayer.Services
{
    /// <summary>
    /// Thrown when an attempt is made to add a TODO item whose title already exists.
    /// </summary>
    public class DuplicateTitleException : InvalidOperationException
    {
        public DuplicateTitleException(string title)
            : base($"A TODO item with the title '{title}' already exists.")
        {
            Title = title;
        }

        public string Title { get; }
    }
}
