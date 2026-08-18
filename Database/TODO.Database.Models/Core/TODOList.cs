using System.ComponentModel;
using TODO.Database.Models.Static;

namespace TODO.Database.Models.Core
{
    public class TODOList
    {

        public required string Title { get; set; }

        public string? Description { get; set; }

        public Category Category { get; set; }

        public Priority Priority { get; set; }

        [DefaultValue(false)]
        public bool IsCompleted { get; set; }

        [ReadOnly(true)]
        public DateTime CreatedAt { get; set; }
    }
}
