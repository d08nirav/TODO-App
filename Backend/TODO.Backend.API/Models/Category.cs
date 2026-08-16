using System.ComponentModel;

namespace TODO.Backend.API.Models
{
    public enum Category : byte
    {
        // Default value for Category is None (0)
        [Description("None")]
        None = 0,
        [Description("Personal")]
        Personal = 1,
        [Description("Work")]
        Work = 2,
        [Description("Shopping")]
        Shopping = 3,
        [Description("Home")]
        Home = 4
    }
}
